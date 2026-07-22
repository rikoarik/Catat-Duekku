# Telegram

## One official bot

Users do not enter a bot token.

## Linking

Use a one-time deep-link code with a ten-minute expiry.

## Commands

```text
/start
/help
/masuk 3000000 Gaji Gaji Juli
/keluar 25000 Makan Makan siang
/saldo
/terakhir
/utang
/bayarutang ID 200000
```

## AI messages

Accept natural text:

```text
makan siang 25 ribu pakai bank
gaji masuk 3 juta
bayar Kredivo 200 ribu
```

Flow:

1. parse;
2. display transaction preview;
3. user confirms;
4. save once.

## Receipt photos

1. validate file;
2. parse temporarily;
3. display extraction preview;
4. user confirms;
5. remove temporary image.

## Safety

- verify webhook secret;
- check linked Telegram ID;
- use Telegram update ID for idempotency;
- limit message and image size;
- never log bot or AI keys;
- never save AI output without confirmation.
