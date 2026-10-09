#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Address, BytesN, Env, IntoVal,
};

const UNIT: i128 = 10_000_000; // 7 decimales
const CAMPAIGN: u64 = 1;

struct Setup<'a> {
    env: Env,
    admin: Address,
    owner: Address,
    creator1: Address,
    creator2: Address,
    token: TokenClient<'a>,
    client: WavoRewardsClient<'a>,
}

fn rid(env: &Env, n: u8) -> BytesN<32> {
    BytesN::from_array(env, &[n; 32])
}

/// Campaña demo: presupuesto 100 unidades, CPM 2 unidades, totalmente financiada.
fn setup<'a>() -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let creator1 = Address::generate(&env);
    let creator2 = Address::generate(&env);

    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let token_addr = sac.address();
    StellarAssetClient::new(&env, &token_addr).mint(&owner, &(1_000 * UNIT));
    let token = TokenClient::new(&env, &token_addr);

    let contract_id = env.register(WavoRewards, ());
    let client = WavoRewardsClient::new(&env, &contract_id);
    client.initialize(&admin, &token_addr);
    client.create_campaign(&CAMPAIGN, &owner, &(2 * UNIT), &(100 * UNIT));
    client.fund_campaign(&CAMPAIGN, &owner, &(100 * UNIT));

    Setup {
        env,
        admin,
        owner,
        creator1,
        creator2,
        token,
        client,
    }
}

#[test]
fn funding_moves_tokens_into_custody() {
    let s = setup();
    assert_eq!(s.token.balance(&s.client.address), 100 * UNIT);
    assert_eq!(s.token.balance(&s.owner), 900 * UNIT);
    let c = s.client.get_campaign(&CAMPAIGN);
    assert_eq!(c.funded, 100 * UNIT);
    assert_eq!(c.cpm, 2 * UNIT);
    assert_eq!(s.client.available(&CAMPAIGN), 100 * UNIT);
}

#[test]
fn payout_demo_20_and_15() {
    let s = setup();
    // 10_000 vistas * 2 / 1000 = 20 ; 7_500 vistas * 2 / 1000 = 15
    s.client
        .distribute_reward(&CAMPAIGN, &rid(&s.env, 1), &s.creator1, &(20 * UNIT));
    s.client
        .distribute_reward(&CAMPAIGN, &rid(&s.env, 2), &s.creator2, &(15 * UNIT));

    assert_eq!(s.token.balance(&s.creator1), 20 * UNIT);
    assert_eq!(s.token.balance(&s.creator2), 15 * UNIT);
    assert_eq!(s.token.balance(&s.client.address), 65 * UNIT);

    let c = s.client.get_campaign(&CAMPAIGN);
    assert_eq!(c.paid, 35 * UNIT);
    assert_eq!(s.client.available(&CAMPAIGN), 65 * UNIT);

    let r = s.client.get_reward(&rid(&s.env, 1)).unwrap();
    assert_eq!(r.status, RewardStatus::Paid);
    assert_eq!(r.recipient, Some(s.creator1.clone()));
}

#[test]
fn distribute_requires_admin_auth() {
    let s = setup();
    s.client
        .distribute_reward(&CAMPAIGN, &rid(&s.env, 1), &s.creator1, &(20 * UNIT));
    let auths = s.env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, s.admin);
}

#[test]
fn non_admin_cannot_distribute() {
    let s = setup();
    let attacker = Address::generate(&s.env);
    let reward = rid(&s.env, 9);
    let amount = 50 * UNIT;
    s.env.mock_auths(&[MockAuth {
        address: &attacker,
        invoke: &MockAuthInvoke {
            contract: &s.client.address,
            fn_name: "distribute_reward",
            args: (CAMPAIGN, reward.clone(), attacker.clone(), amount).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    let res = s
        .client
        .try_distribute_reward(&CAMPAIGN, &reward, &attacker, &amount);
    assert!(res.is_err());
    assert_eq!(s.token.balance(&attacker), 0);
}

#[test]
fn non_owner_cannot_withdraw() {
    let s = setup();
    let attacker = Address::generate(&s.env);
    let amount = 10 * UNIT;
    s.env.mock_auths(&[MockAuth {
        address: &attacker,
        invoke: &MockAuthInvoke {
            contract: &s.client.address,
            fn_name: "withdraw_unallocated",
            args: (CAMPAIGN, amount).into_val(&s.env),
            sub_invokes: &[],
        },
    }]);
    assert!(s.client.try_withdraw_unallocated(&CAMPAIGN, &amount).is_err());
    assert_eq!(s.token.balance(&s.client.address), 100 * UNIT);
}

#[test]
fn stranger_cannot_close_campaign() {
    let s = setup();
    let stranger = Address::generate(&s.env);
    let res = s.client.try_close_campaign(&CAMPAIGN, &stranger);
    assert_eq!(res, Err(Ok(Error::Unauthorized)));
}

#[test]
fn insufficient_funds_blocks_payout() {
    let s = setup();
    let res = s
        .client
        .try_distribute_reward(&CAMPAIGN, &rid(&s.env, 1), &s.creator1, &(101 * UNIT));
    assert_eq!(res, Err(Ok(Error::InsufficientFunds)));

    // Lo reservado tampoco puede usarse para otro pago.
    s.client.reserve_reward(&CAMPAIGN, &rid(&s.env, 2), &(90 * UNIT));
    let res = s
        .client
        .try_distribute_reward(&CAMPAIGN, &rid(&s.env, 3), &s.creator1, &(20 * UNIT));
    assert_eq!(res, Err(Ok(Error::InsufficientFunds)));
    assert_eq!(s.token.balance(&s.creator1), 0);
}

#[test]
fn double_distribution_is_rejected() {
    let s = setup();
    let reward = rid(&s.env, 1);
    s.client
        .distribute_reward(&CAMPAIGN, &reward, &s.creator1, &(20 * UNIT));
    let res = s
        .client
        .try_distribute_reward(&CAMPAIGN, &reward, &s.creator1, &(20 * UNIT));
    assert_eq!(res, Err(Ok(Error::RewardAlreadyPaid)));
    let res = s.client.try_reserve_reward(&CAMPAIGN, &reward, &(20 * UNIT));
    assert_eq!(res, Err(Ok(Error::RewardAlreadyPaid)));
    assert_eq!(s.token.balance(&s.creator1), 20 * UNIT);
}

#[test]
fn reserved_payout_must_match_amount() {
    let s = setup();
    let reward = rid(&s.env, 1);
    s.client.reserve_reward(&CAMPAIGN, &reward, &(20 * UNIT));
    let res = s
        .client
        .try_distribute_reward(&CAMPAIGN, &reward, &s.creator1, &(30 * UNIT));
    assert_eq!(res, Err(Ok(Error::RewardMismatch)));
    s.client
        .distribute_reward(&CAMPAIGN, &reward, &s.creator1, &(20 * UNIT));
    let c = s.client.get_campaign(&CAMPAIGN);
    assert_eq!(c.reserved, 0);
    assert_eq!(c.paid, 20 * UNIT);
}

#[test]
fn owner_recovers_only_uncommitted_funds() {
    let s = setup();
    s.client
        .distribute_reward(&CAMPAIGN, &rid(&s.env, 1), &s.creator1, &(20 * UNIT));
    s.client.reserve_reward(&CAMPAIGN, &rid(&s.env, 2), &(15 * UNIT));
    // disponible = 100 - 20 pagado - 15 reservado = 65
    assert_eq!(s.client.available(&CAMPAIGN), 65 * UNIT);

    let res = s.client.try_withdraw_unallocated(&CAMPAIGN, &(66 * UNIT));
    assert_eq!(res, Err(Ok(Error::InsufficientFunds)));

    s.client.withdraw_unallocated(&CAMPAIGN, &(40 * UNIT));
    assert_eq!(s.token.balance(&s.owner), 940 * UNIT);

    let refunded = s.client.close_campaign(&CAMPAIGN, &s.owner);
    assert_eq!(refunded, 25 * UNIT);
    assert_eq!(s.token.balance(&s.owner), 965 * UNIT);
    // Solo queda en custodia lo reservado para el creador 2.
    assert_eq!(s.token.balance(&s.client.address), 15 * UNIT);

    // Tras el cierre: lo reservado sigue siendo pagable, nada más.
    let res = s
        .client
        .try_distribute_reward(&CAMPAIGN, &rid(&s.env, 3), &s.creator1, &(1 * UNIT));
    assert_eq!(res, Err(Ok(Error::CampaignClosed)));
    s.client
        .distribute_reward(&CAMPAIGN, &rid(&s.env, 2), &s.creator2, &(15 * UNIT));
    assert_eq!(s.token.balance(&s.creator2), 15 * UNIT);
    assert_eq!(s.token.balance(&s.client.address), 0);

    let res = s.client.try_fund_campaign(&CAMPAIGN, &s.owner, &UNIT);
    assert_eq!(res, Err(Ok(Error::CampaignClosed)));
}

#[test]
fn release_frees_reservation() {
    let s = setup();
    s.client.reserve_reward(&CAMPAIGN, &rid(&s.env, 1), &(30 * UNIT));
    assert_eq!(s.client.available(&CAMPAIGN), 70 * UNIT);
    s.client.release_reward(&CAMPAIGN, &rid(&s.env, 1));
    assert_eq!(s.client.available(&CAMPAIGN), 100 * UNIT);
    assert!(s.client.get_reward(&rid(&s.env, 1)).is_none());
}

#[test]
fn guards_on_init_budget_and_amounts() {
    let s = setup();
    let other_token = Address::generate(&s.env);
    assert_eq!(
        s.client.try_initialize(&s.admin, &other_token),
        Err(Ok(Error::AlreadyInitialized))
    );
    assert_eq!(
        s.client.try_fund_campaign(&CAMPAIGN, &s.owner, &UNIT),
        Err(Ok(Error::BudgetExceeded))
    );
    assert_eq!(
        s.client
            .try_create_campaign(&CAMPAIGN, &s.owner, &(2 * UNIT), &0),
        Err(Ok(Error::CampaignExists))
    );
    assert_eq!(
        s.client.try_create_campaign(&2, &s.owner, &0, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        s.client
            .try_distribute_reward(&CAMPAIGN, &rid(&s.env, 1), &s.creator1, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        s.client.try_get_campaign(&99),
        Err(Ok(Error::CampaignNotFound))
    );
}
