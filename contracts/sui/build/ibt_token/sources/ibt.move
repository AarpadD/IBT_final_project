module ibt_token::ibt {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url;

    public struct IBT has drop {}

    fun init(witness: IBT, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"IBT",
            b"Inter-Blockchain Token",
            b"Token for cross-chain bridge",
            option::some(url::new_unsafe_from_bytes(b"https://example.com/ibt.png")),
            ctx
        );

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    public entry fun mint(
        treasury_cap: &mut TreasuryCap<IBT>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    public entry fun burn(
        treasury_cap: &mut TreasuryCap<IBT>,
        coin: Coin<IBT>
    ) {
        coin::burn(treasury_cap, coin);
    }
}