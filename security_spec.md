# Security Specification

## 1. Data Invariants
- The tournament is represented by a single, global state document located at `/state/current`.
- This document contains all matches, jury accounts, configured status, and current counts.
- It must be readable and writeable by the Node backend.

## 2. The "Dirty Dozen" Payloads (TDD)
Since all client interaction goes through our server APIs, we ensure the backend acts as the gatekeeper. However, on the Firestore layer, the following operations must be handled securely:
1. Deny access to arbitrary collections (e.g. `/users`, `/billing`, `/secrets`).
2. Deny deletion of the singleton state document.
3. Allow the backend server (acting unauthenticated via the client SDK) to read `/state/current`.
4. Allow the backend server to write and update `/state/current`.
