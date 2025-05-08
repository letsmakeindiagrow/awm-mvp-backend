# Ledger System Design Checklist

This checklist will help us design and implement the ledger system.

## I. Core Concepts & Definitions

- [ ] **Ledger Entry**: Define the structure of a single ledger entry. What information must it contain?
  - [ ] Timestamp (Date)
  - [ ] Voucher Type (e.g., Bank Receipt, Bank Payment, Journal, Book Voucher)
  - [ ] Narration (Description of the transaction)
  - [ ] Debit Amount
  - [ ] Credit Amount
  - [ ] Running Balance
- [ ] **Voucher Types**: Clearly define each voucher type and the scenarios it covers.
  - [ ] `Bank Receipt`: Funds added to the user's wallet.
  - [ ] `Bank Payment`: Funds withdrawn from the user's wallet.
  - [ ] `Journal Voucher`: Non-cash transactions (e.g., TDS, expenses, accruals).
  - [ ] `Book Voucher`: Investment-related transactions (e.g., new investment, maturity, profit booking).
- [ ] **Running Balance**: How will this be calculated and maintained?
  - [ ] Is it stored per entry, or calculated on the fly?
  - [ ] How do we ensure its accuracy?
- [ ] **User Association**: How is each ledger entry linked to a specific user?

## II. Prisma Schema Considerations

- [ ] **New Ledger Model**: Do we need a new Prisma model for ledger entries?
  - [ ] `LedgerEntry` (or similar name)
  - [ ] Fields for all columns identified above (Timestamp, Voucher, Narration, Dr, Cr, Balance).
  - [ ] Relation to the `User` model.
- [ ] **Existing Model Integration**: How do existing models like `FundTransaction` and `UserInvestment` trigger ledger entries?
  - [ ] `FundTransaction` (DEPOSIT) -> `Bank Receipt`
  - [ ] `FundTransaction` (WITHDRAWAL) -> `Bank Payment`
  - [ ] `UserInvestment` (New Investment) -> `Book Voucher` (Debit)
  - [ ] `UserInvestment` (Maturity/Closure) -> `Book Voucher` (Credit for principal + gains)
- [ ] **TDS & Expenses**: How are these recorded?
  - [ ] Do they relate to a specific `UserInvestment` or are they general user-level entries?
  - [ ] Will these require their own Prisma models or can they be handled by a generic `JournalVoucher` type within the ledger?

## III. Logic and Service Layer

- [ ] **Ledger Service**: A dedicated service to create and manage ledger entries.
  - [ ] Functions to record each voucher type.
  - [ ] Logic for calculating running balance.
- [ ] **Transaction Atomicity**: How do we ensure that a financial operation (e.g., a deposit) and its corresponding ledger entry are created together, or not at all if an error occurs? (Think database transactions).
- [ ] **Data Integrity**: How do we prevent inconsistencies in the ledger?

## IV. API Endpoints (Future Consideration)

- [ ] Endpoint to fetch a user's ledger statement (paginated, filterable by date/voucher type).

## V. Thought-Provoking Questions for Deeper Understanding

- What happens if a `FundTransaction` is `REJECTED` after initially being `PENDING` or `APPROVED`? How should the ledger reflect this correction?
- How will you handle rounding for financial calculations, especially with `Decimal` types for ROI and amounts?
- For `Book Vouchers` related to investment closure, how will you differentiate between the principal amount and the gains in the narration or separate entries?
- How would you design the system to allow for corrections or reversals of ledger entries if a mistake is made? What are the implications?
- What are the performance considerations if a user has a very large number of ledger entries? How would you optimize fetching their statement?
- From an accounting perspective, should `Debit` always increase assets/expenses and `Credit` always increase liabilities/income/equity? How does this map to your voucher types?

---

Let's start by discussing these points.
