use soroban_sdk::{contractevent, Address};

#[contractevent]
pub struct SlotOpened {
    #[topic]
    pub start: u64,
    pub admin: Address,
}

#[contractevent]
pub struct SlotReserved {
    #[topic]
    pub start: u64,
    pub user: Address,
}

#[contractevent]
pub struct SlotCancelled {
    #[topic]
    pub start: u64,
    pub user: Address,
}
