# Project Instructions: Smart Campus Assignment #04

## Project Scope
- Extend the Smart Campus room availability checker to support a catalog of exactly ONE fictional room.
  (Replaces the previous "at least FOUR rooms" requirement.)
- Implement filtering rules: Capacity (F1), Equipment (F2), Blocked status (F3), Empty state (F4), and dynamic room switching (F5).
- ## Filtering Rules (F1–F5)
- **F1 (Capacity):** Room capacity must be greater than or equal to requested attendees.
- **F2 (Equipment):** Room must contain ALL selected required items.
- **F3 (Blocked Status):** A blocked room cannot be reported as available or selected for booking.
- **F4 (Empty State):** Show a clear empty state when no rooms match the criteria.
- **F5 (Room Switching):** Changing the selected room must immediately refresh the availability result.
- Preserve existing availability rules AC1–AC5: valid times, max 120 minutes, no overlaps except touching endpoints, immutable booking data. (Note: "AC6" was referenced previously but never defined anywhere in the repo; it is removed from requirements until someone supplies its definition.)

## Engineering Rules
- Maintain a strict separation of concerns: split data fixtures, pure validation logic, filtering rules, and React UI components.
- Avoid unnecessary design patterns; keep functions pure and modular.
- Do not add a database, backend server, or user authentication.

## Deployment and Secrets
- Do not deploy externally or integrate third-party APIs/services.
- Never commit secrets, API keys, tokens, or credential files.

## Verification
- Run `npm run test` before proposing acceptance and report the result. Ensure at least 10 executable tests pass covering AC1–AC5 and F1–F5.
- Do not add, remove, or upgrade dependencies without human approval.

## Human Review Gates
- Human approval is required before: any change to package.json, any change to data fixtures (rooms/bookings), and any change to this file.
