#![no_std]
//! WavoRewards: custodia de presupuesto de campañas de Content Rewards y
//! distribución de recompensas aprobadas por un admin (verificación off-chain).
//!
//! Contabilidad por campaña (todas las cantidades en unidades mínimas del token):
//!   balance    = funded - paid - refunded
//!   available  = balance - reserved
//! El owner solo puede recuperar `available`; lo reservado queda comprometido
//! con creadores y sigue siendo pagable incluso tras cerrar la campaña.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, BytesN,
    Env,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const INSTANCE_TTL_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;
const INSTANCE_TTL_EXTEND: u32 = 30 * DAY_IN_LEDGERS;
const PERSISTENT_TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const PERSISTENT_TTL_EXTEND: u32 = 120 * DAY_IN_LEDGERS;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    CampaignExists = 4,
    CampaignNotFound = 5,
    CampaignClosed = 6,
    InvalidAmount = 7,
    InsufficientFunds = 8,
    RewardAlreadyPaid = 9,
    RewardAlreadyReserved = 10,
    RewardNotFound = 11,
    RewardMismatch = 12,
    BudgetExceeded = 13,
    Overflow = 14,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub owner: Address,
    /// Recompensa en unidades mínimas por cada 1000 vistas verificadas.
    pub cpm: i128,
    /// Tope de financiación total (0 = sin tope).
    pub budget: i128,
    pub funded: i128,
    pub reserved: i128,
    pub paid: i128,
    pub refunded: i128,
    pub closed: bool,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RewardStatus {
    Reserved,
    Paid,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reward {
    pub campaign_id: u64,
    pub amount: i128,
    pub status: RewardStatus,
    pub recipient: Option<Address>,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Token,
    Campaign(u64),
    Reward(BytesN<32>),
}

#[contractevent(topics = ["wavo", "funded"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Funded {
    #[topic]
    pub campaign_id: u64,
    pub from: Address,
    pub amount: i128,
    pub total_funded: i128,
}

#[contractevent(topics = ["wavo", "reserved"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reserved {
    #[topic]
    pub campaign_id: u64,
    pub reward_id: BytesN<32>,
    pub amount: i128,
}

#[contractevent(topics = ["wavo", "payout"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Payout {
    #[topic]
    pub campaign_id: u64,
    pub reward_id: BytesN<32>,
    pub recipient: Address,
    pub amount: i128,
}

#[contractevent(topics = ["wavo", "refund"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Refunded {
    #[topic]
    pub campaign_id: u64,
    pub owner: Address,
    pub amount: i128,
}

#[contractevent(topics = ["wavo", "closed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Closed {
    #[topic]
    pub campaign_id: u64,
    pub refunded: i128,
    pub still_reserved: i128,
}

#[contract]
pub struct WavoRewards;

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_EXTEND);
}

fn admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn token_client(env: &Env) -> Result<token::TokenClient<'_>, Error> {
    let addr: Address = env
        .storage()
        .instance()
        .get(&DataKey::Token)
        .ok_or(Error::NotInitialized)?;
    Ok(token::TokenClient::new(env, &addr))
}

fn load_campaign(env: &Env, id: u64) -> Result<Campaign, Error> {
    let key = DataKey::Campaign(id);
    let c: Campaign = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(Error::CampaignNotFound)?;
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND);
    Ok(c)
}

fn save_campaign(env: &Env, id: u64, c: &Campaign) {
    let key = DataKey::Campaign(id);
    env.storage().persistent().set(&key, c);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND);
}

fn save_reward(env: &Env, reward_id: &BytesN<32>, r: &Reward) {
    let key = DataKey::Reward(reward_id.clone());
    env.storage().persistent().set(&key, r);
    env.storage()
        .persistent()
        .extend_ttl(&key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_EXTEND);
}

fn load_reward(env: &Env, reward_id: &BytesN<32>) -> Option<Reward> {
    env.storage()
        .persistent()
        .get(&DataKey::Reward(reward_id.clone()))
}

fn balance_of(c: &Campaign) -> Result<i128, Error> {
    c.funded
        .checked_sub(c.paid)
        .and_then(|v| v.checked_sub(c.refunded))
        .ok_or(Error::Overflow)
}

fn available_of(c: &Campaign) -> Result<i128, Error> {
    balance_of(c)?.checked_sub(c.reserved).ok_or(Error::Overflow)
}

#[contractimpl]
impl WavoRewards {
    /// Configura admin (verificador/pagador) y token. Solo una vez.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        bump_instance(&env);
        Ok(())
    }

    pub fn create_campaign(
        env: Env,
        campaign_id: u64,
        owner: Address,
        cpm: i128,
        budget: i128,
    ) -> Result<(), Error> {
        admin(&env)?;
        owner.require_auth();
        if cpm <= 0 || budget < 0 {
            return Err(Error::InvalidAmount);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Campaign(campaign_id))
        {
            return Err(Error::CampaignExists);
        }
        let c = Campaign {
            owner,
            cpm,
            budget,
            funded: 0,
            reserved: 0,
            paid: 0,
            refunded: 0,
            closed: false,
        };
        save_campaign(&env, campaign_id, &c);
        bump_instance(&env);
        Ok(())
    }

    pub fn fund_campaign(
        env: Env,
        campaign_id: u64,
        from: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut c = load_campaign(&env, campaign_id)?;
        if c.closed {
            return Err(Error::CampaignClosed);
        }
        let new_funded = c.funded.checked_add(amount).ok_or(Error::Overflow)?;
        if c.budget > 0 && new_funded > c.budget {
            return Err(Error::BudgetExceeded);
        }
        c.funded = new_funded;
        save_campaign(&env, campaign_id, &c);

        token_client(&env)?.transfer(&from, &env.current_contract_address(), &amount);

        Funded {
            campaign_id,
            from,
            amount,
            total_funded: new_funded,
        }
        .publish(&env);
        bump_instance(&env);
        Ok(new_funded)
    }

    /// Compromete fondos para una recompensa aprobada (opcional antes del pago).
    pub fn reserve_reward(
        env: Env,
        campaign_id: u64,
        reward_id: BytesN<32>,
        amount: i128,
    ) -> Result<(), Error> {
        admin(&env)?.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if let Some(r) = load_reward(&env, &reward_id) {
            return Err(match r.status {
                RewardStatus::Paid => Error::RewardAlreadyPaid,
                RewardStatus::Reserved => Error::RewardAlreadyReserved,
            });
        }
        let mut c = load_campaign(&env, campaign_id)?;
        if c.closed {
            return Err(Error::CampaignClosed);
        }
        if amount > available_of(&c)? {
            return Err(Error::InsufficientFunds);
        }
        c.reserved = c.reserved.checked_add(amount).ok_or(Error::Overflow)?;
        save_campaign(&env, campaign_id, &c);
        save_reward(
            &env,
            &reward_id,
            &Reward {
                campaign_id,
                amount,
                status: RewardStatus::Reserved,
                recipient: None,
            },
        );
        Reserved {
            campaign_id,
            reward_id,
            amount,
        }
        .publish(&env);
        bump_instance(&env);
        Ok(())
    }

    /// Libera una reserva no pagada (p. ej. envío rechazado tras revisión).
    pub fn release_reward(env: Env, campaign_id: u64, reward_id: BytesN<32>) -> Result<(), Error> {
        admin(&env)?.require_auth();
        let r = load_reward(&env, &reward_id).ok_or(Error::RewardNotFound)?;
        if r.status == RewardStatus::Paid {
            return Err(Error::RewardAlreadyPaid);
        }
        if r.campaign_id != campaign_id {
            return Err(Error::RewardMismatch);
        }
        let mut c = load_campaign(&env, campaign_id)?;
        c.reserved = c.reserved.checked_sub(r.amount).ok_or(Error::Overflow)?;
        save_campaign(&env, campaign_id, &c);
        env.storage()
            .persistent()
            .remove(&DataKey::Reward(reward_id));
        bump_instance(&env);
        Ok(())
    }

    /// Paga una recompensa aprobada. `reward_id` es único: nunca se paga dos veces.
    pub fn distribute_reward(
        env: Env,
        campaign_id: u64,
        reward_id: BytesN<32>,
        recipient: Address,
        amount: i128,
    ) -> Result<(), Error> {
        admin(&env)?.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let mut c = load_campaign(&env, campaign_id)?;

        match load_reward(&env, &reward_id) {
            Some(r) if r.status == RewardStatus::Paid => return Err(Error::RewardAlreadyPaid),
            Some(r) => {
                if r.campaign_id != campaign_id || r.amount != amount {
                    return Err(Error::RewardMismatch);
                }
                c.reserved = c.reserved.checked_sub(amount).ok_or(Error::Overflow)?;
            }
            None => {
                if c.closed {
                    return Err(Error::CampaignClosed);
                }
                if amount > available_of(&c)? {
                    return Err(Error::InsufficientFunds);
                }
            }
        }

        c.paid = c.paid.checked_add(amount).ok_or(Error::Overflow)?;
        save_campaign(&env, campaign_id, &c);
        save_reward(
            &env,
            &reward_id,
            &Reward {
                campaign_id,
                amount,
                status: RewardStatus::Paid,
                recipient: Some(recipient.clone()),
            },
        );

        token_client(&env)?.transfer(&env.current_contract_address(), &recipient, &amount);

        Payout {
            campaign_id,
            reward_id,
            recipient,
            amount,
        }
        .publish(&env);
        bump_instance(&env);
        Ok(())
    }

    /// El owner recupera fondos no comprometidos sin cerrar la campaña.
    pub fn withdraw_unallocated(env: Env, campaign_id: u64, amount: i128) -> Result<(), Error> {
        let mut c = load_campaign(&env, campaign_id)?;
        c.owner.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if amount > available_of(&c)? {
            return Err(Error::InsufficientFunds);
        }
        c.refunded = c.refunded.checked_add(amount).ok_or(Error::Overflow)?;
        save_campaign(&env, campaign_id, &c);
        let owner = c.owner.clone();
        token_client(&env)?.transfer(&env.current_contract_address(), &owner, &amount);
        Refunded {
            campaign_id,
            owner,
            amount,
        }
        .publish(&env);
        bump_instance(&env);
        Ok(())
    }

    /// Cierra la campaña (owner o admin) y devuelve al owner el saldo no comprometido.
    /// Las recompensas ya reservadas siguen siendo pagables.
    pub fn close_campaign(env: Env, campaign_id: u64, caller: Address) -> Result<i128, Error> {
        caller.require_auth();
        let admin = admin(&env)?;
        let mut c = load_campaign(&env, campaign_id)?;
        if caller != c.owner && caller != admin {
            return Err(Error::Unauthorized);
        }
        if c.closed {
            return Err(Error::CampaignClosed);
        }
        let refund = available_of(&c)?;
        c.closed = true;
        c.refunded = c.refunded.checked_add(refund).ok_or(Error::Overflow)?;
        save_campaign(&env, campaign_id, &c);
        if refund > 0 {
            token_client(&env)?.transfer(&env.current_contract_address(), &c.owner, &refund);
        }
        Closed {
            campaign_id,
            refunded: refund,
            still_reserved: c.reserved,
        }
        .publish(&env);
        bump_instance(&env);
        Ok(refund)
    }

    pub fn get_campaign(env: Env, campaign_id: u64) -> Result<Campaign, Error> {
        load_campaign(&env, campaign_id)
    }

    pub fn available(env: Env, campaign_id: u64) -> Result<i128, Error> {
        available_of(&load_campaign(&env, campaign_id)?)
    }

    pub fn get_reward(env: Env, reward_id: BytesN<32>) -> Option<Reward> {
        load_reward(&env, &reward_id)
    }

    pub fn admin(env: Env) -> Result<Address, Error> {
        admin(&env)
    }

    pub fn token(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)
    }
}

#[cfg(test)]
mod test;
