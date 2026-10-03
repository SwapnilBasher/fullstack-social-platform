# Codexgram Implementation Plan

Status: product and architecture plan for a small Android-first beta. No application code is specified by this document.

## 1. Product Definition

Codexgram is a simple Instagram-style social media mobile app for a private network or small beta community. Authenticated users can create image posts, follow other users, view a chronological feed from followed users, and interact with posts through likes and comments.

The core promise is a fast, understandable loop:

`Sign in -> complete profile -> find people -> follow -> see posts -> publish -> interact`

### Primary user

- A member of a small social network who wants to share photos and see updates from people they follow.
- Android is the first target. iOS compatibility should be preserved where practical because the app is built with Expo/React Native.
- Expected initial scale is a few hundred users and a modest number of posts.

### V1 success criteria

- A new user can sign in, finish profile setup, find another user, follow them, and see their posts.
- A user can reliably create one image post with an optional caption.
- The feed is chronological and limited to content the current user is authorized to view.
- Likes, comments, follows, and in-app activity work consistently across app restarts and devices.
- Basic blocking, reporting, and admin moderation exist before a wider beta.

## 2. Locked V1 Decisions

- Client: Expo/React Native with Expo Router. Routes live under `src/app/`.
- Authentication: Clerk.
- Sign-in providers: Google and Apple only. No email/password fallback in v1.
- Backend and database: Convex.
- Media storage: prefer Convex file storage unless implementation verification shows a concrete limitation.
- Platforms: Android first; keep the implementation cross-platform and iOS-ready.
- Account visibility: all accounts are public. There are no private accounts or follow requests.
- Post visibility: followers-only. A post is visible to its author and users who follow the author, subject to blocking and moderation state.
- Feed: chronological, newest first, cursor-paginated.
- Posts: one image per post, optional caption, create and delete only. No post editing in v1.
- Interactions: likes, text comments, and follows. Comments have no replies.
- Notifications: in-app activity only for follows, likes, and comments. No push notifications in v1.
- Profile: avatar, username, display name, bio, follower count, following count, and post grid.
- Moderation: users can block and report; admins can review reports, remove posts/comments, and suspend accounts.
- Delivery: EAS development, preview, and production builds.
- Offline: no offline posting queue in v1. The app should show clear retry states and preserve unsent input where practical.

## 3. Explicitly Out Of Scope

- Video posts and video processing.
- Multiple media items in one post, carousels, stories, reels, live video, or direct messages.
- Private accounts, follow approvals, close friends, or audience selection per post.
- Caption search, hashtags, discovery ranking, algorithmic recommendations, or public explore.
- Push notifications, email notifications, and SMS notifications.
- Post editing, comment replies, saved posts, sharing, reposts, or quote posts.
- Web as a supported product surface.
- Monetization, subscriptions, ads, or creator payouts.
- Advanced moderation automation, content recognition, or a full admin dashboard.

## 4. Core User Journeys

### 4.1 First launch and authentication

1. The app opens on an auth screen when no valid Clerk session exists.
2. The user chooses Continue with Google or Continue with Apple.
3. Clerk completes the provider flow and returns an authenticated session.
4. The app checks whether a Convex profile exists for the Clerk user ID.
5. A new user is routed to required profile setup. A returning user is routed to the main feed.
6. Auth failures are shown inline with a retry path; cancellation returns to the auth screen without creating partial app data.

### 4.2 Required profile setup

1. The user enters a unique username/handle and display name.
2. The user may add an avatar and bio, but these remain optional in v1.
3. Username availability is validated before submission and revalidated server-side.
4. Successful completion creates or activates the profile and opens the suggested-people/feed experience.
5. Leaving before completion returns the user to setup on the next authenticated launch.

### 4.3 Main feed

1. The user lands on a chronological feed of posts from followed users and the current user.
2. Each post shows author identity, image, caption if present, timestamp, like state/count, and comment count.
3. Tapping the like control updates the visible state quickly and reconciles with Convex.
4. Tapping the comment affordance opens post detail/comments.
5. Pull-to-refresh reloads the newest page. Scrolling loads more posts with cursor pagination.
6. A first-time or empty feed shows suggested people and a clear route to search rather than an unexplained blank screen.
7. Loading, empty, retry, unauthorized, and deleted-content states are designed explicitly.

### 4.4 Find and follow people

1. The user opens Search or the suggested-people section.
2. The user searches by username, not by caption.
3. Results show public profile identity, follow state, and a follow/unfollow action.
4. Follow is immediate because accounts are public.
5. The user can open a profile to view its authorized post grid and counts.

### 4.5 Create an image post

1. The user opens the create flow from the main navigation.
2. The user chooses an image from the device library or captures one with the camera, subject to platform permission state.
3. The app previews the image and accepts an optional caption.
4. The app validates the selected file and displays upload progress/state.
5. The image is uploaded to storage, then a post record is created only after a successful upload.
6. The create action is protected against accidental duplicate submission.
7. On success, the user returns to the feed or post detail with the new post visible.
8. On failure, the draft is retained when possible and the user can retry or cancel. Orphaned uploads must be cleaned up or made recoverable.

### 4.6 Post detail and comments

1. The user opens a post they are authorized to view.
2. The screen shows the image, author, caption, counts, and comments.
3. The user submits a text comment.
4. A user can delete their own comment; a post author can delete comments on their post.
5. Deleted posts/comments disappear from normal reads while preserving enough state for moderation/audit decisions as appropriate.

### 4.7 Activity

1. The activity screen lists in-app events for follows, likes, and comments.
2. Events are ordered newest first and identify the actor and relevant post/profile where applicable.
3. Activity may be marked read or represented by an unread count; the exact read UX is an implementation decision.
4. No event is sent as push notification in v1.

### 4.8 Account lifecycle

- Settings supports sign out.
- Settings supports permanent account deletion with a confirmation step.
- Deletion must define cleanup of the Clerk user, profile, posts, media, follows, likes, comments, activities, blocks, and reports before implementation.

## 5. Data Model

Convex is the source of truth for application data. Clerk is the source of truth for authentication identity and provider accounts. Records reference the Clerk subject/user ID rather than copying provider credentials.

### `profiles`

- `userId`: Clerk subject; required and unique.
- `username`: display handle; required.
- `normalizedUsername`: canonical lowercase/search form; required and unique.
- `displayName`: required.
- `bio`: optional, length-limited.
- `avatarStorageId`: optional Convex storage ID.
- `role`: `user` or `admin`.
- `status`: active or suspended; exact enum to be finalized.
- `createdAt`, `updatedAt`: server timestamps.

Indexes should support lookup by `userId` and exact username search. Username validation must be enforced in Convex, not only in the client.

### `follows`

- `followerId`: Clerk user ID; required.
- `followingId`: Clerk user ID; required.
- `createdAt`: server timestamp.

The `(followerId, followingId)` pair is unique. Self-following is rejected. Queries need efficient access by follower and by followed user.

### `posts`

- `authorId`: Clerk user ID; required.
- `storageId`: image storage ID; required.
- `mediaType`: fixed to `image` in v1.
- `caption`: optional, length-limited.
- `createdAt`: server timestamp, used for feed ordering.
- `status` or deletion metadata: supports moderation and soft-delete behavior if required.

Posts must only be returned when the viewer is the author or follows the author, and neither side is blocked or suspended. The implementation must decide whether post URLs are generated at query time or through a server action and must avoid exposing unauthorized storage URLs.

### `likes`

- `postId`, `userId`, and `createdAt`.
- Unique `(postId, userId)` pair.
- Toggle operations must be idempotent and authorization-aware.

### `comments`

- `postId`, `authorId`, `body`, and `createdAt`.
- No parent/reply field in v1.
- Optional deletion/moderation metadata.
- Body is validated for non-empty content and a maximum length.

### `activities`

- `recipientId`: profile owner receiving the event.
- `actorId`: user causing the event.
- `type`: follow, like, or comment.
- Optional `postId` and `commentId` references.
- `createdAt` and optional `readAt`.

Activity creation should be idempotent where duplicate client retries could otherwise create duplicate events. Unfollow and unlike behavior needs a final decision about whether prior activity is removed, retained, or ignored.

### `blocks`

- `blockerId`, `blockedId`, `createdAt`.
- Unique pair and no self-blocking.
- Blocking semantics must remove or hide the relevant relationship and content consistently across feeds, profiles, search, comments, likes, and activity.

### `reports`

- `reporterId`, target type, target ID, reason, optional details, status, timestamps, and reviewer metadata.
- Reports must prevent obvious duplicate spam without preventing legitimate follow-up reports.
- Admin-only reads and state transitions, except that a reporter may receive a generic submission confirmation.

## 6. Authentication And Authorization

### Authentication

- Clerk owns session creation, refresh, sign-out, and Google/Apple OAuth configuration.
- The client must never treat a locally cached profile as proof of authentication.
- Convex functions must derive the current user from the authenticated Clerk identity on the server.
- First sign-in creates no usable social profile until required setup is completed.

### Authorization matrix

| Capability | Unauthenticated | Authenticated user | Admin |
| --- | --- | --- | --- |
| Sign in/sign out | Sign in | Sign out | Sign out |
| Read public profiles | No app access | Yes, subject to blocks/status | Yes |
| Read posts | No | Author or follower only | Yes, subject to moderation policy |
| Create/delete own posts | No | Yes | Yes for own content |
| Like/comment/follow | No | Yes, if target is visible and not blocked | Yes as a normal user |
| Delete own comments | No | Yes | Yes |
| Delete comments on own posts | No | Yes | Yes |
| Block/report | No | Yes | Yes |
| Review reports | No | No | Yes |
| Remove content/suspend accounts | No | No | Yes |

Every write path rechecks ownership, relationship, status, block state, and input constraints server-side. Client-hidden buttons are not authorization.

## 7. Architecture And Boundaries

### Client

- Expo/React Native app using Expo Router and mobile-first screens under `src/app/`.
- UI state includes form state, upload progress, local loading/error states, and carefully bounded optimistic interaction state.
- Server state comes from Convex subscriptions/queries and mutations; avoid a second application database or duplicated cache source of truth.
- Use stable list keys, image sizing, pagination, and virtualization appropriate for a social feed.

### Clerk boundary

- Owns auth UI/session/provider integrations.
- Supplies authenticated identity to Convex through the supported Clerk/Convex integration for the verified dependency versions.
- Does not own social profiles, follows, posts, or moderation records.

### Convex boundary

- Owns schema, indexes, queries, mutations, authorization, validation, and transactional relationship updates.
- Queries: current profile, feed page, profile page, search users, post detail/comments, activity page, counts, and upload URL/metadata support as required by current Convex storage APIs.
- Mutations: complete/update profile, follow/unfollow, create/delete post, like/unlike, add/delete comment, block/unblock, create report, mark activity read, delete account workflow.
- Actions are used only where external APIs or non-transactional work genuinely require them.

### Storage boundary

- Prefer Convex file storage for original images in v1.
- Store storage IDs in posts/profiles, not permanent client-generated URLs.
- Define accepted MIME types, maximum bytes, image dimensions, upload cancellation behavior, and orphan cleanup before implementing the create flow.
- Any image transformation or thumbnail strategy must be selected from currently supported Expo and Convex capabilities.

### Delivery boundary

- EAS development build for native auth/camera/media behavior.
- Preview build for internal testing.
- Production build for beta release.
- Environment-specific Clerk and Convex configuration must not be committed as secrets.

## 8. State And Data Flow

### Feed

- Query the current user's authorized feed with cursor pagination.
- Sort by server `createdAt`, with a deterministic tie-breaker if timestamps collide.
- Refresh starts a new query window; pagination appends only after the current request succeeds.
- Empty, loading, stale, and error states are separate UI states.
- No offline feed mutation queue in v1.

### Optimistic interactions

- Likes may optimistically toggle in the UI, then reconcile with the mutation result.
- Follows may optimistically update the button/count, but failed mutations must revert visibly.
- Creating a post is not considered successful until both upload and post-record creation succeed.
- Client retries must use mutation design or client request identifiers that prevent duplicate posts, likes, comments, and activities.

### Caching and real time

- Use Convex's supported reactive query behavior for active screens.
- Avoid inventing a separate persistence cache until profiling shows a need.
- Background refresh and pagination must not reorder visible items unexpectedly without a clear refresh action.

## 9. Edge Cases And Failure Behavior

- No profile: route to setup on every authenticated session until complete.
- Username collision: show availability feedback and preserve the entered form.
- Invalid or oversized image: reject before upload when possible and explain the limit.
- Camera/library permission denied: offer a settings/retry path and keep the create screen usable.
- Slow upload: show progress or an indeterminate state, prevent duplicate submission, and allow cancellation if supported.
- Upload succeeds but post creation fails: retry post creation safely or clean up the orphaned file.
- Network failure: preserve caption and selected draft metadata when possible; show retry, never silently discard.
- Deleted or moderated post: show a neutral unavailable state in stale feeds/details and remove it from normal future queries.
- User becomes suspended: block writes and authenticated content access according to the status policy.
- Blocked user: hide the relationship/content consistently; do not rely on client filtering alone.
- Empty search/feed/activity: give each state a useful next action.
- Double taps and repeated submissions: server-side uniqueness/idempotency prevents duplicate records.
- Large feed: paginate, avoid loading all comments/posts at once, and use image dimensions that prevent layout jumps.

## 10. Privacy, Security, And Abuse Controls

- Keep Clerk and Convex secrets in environment configuration managed by the deployment system.
- Never trust client-provided author IDs, role fields, timestamps, counts, or storage permissions.
- Validate all user-generated text and enforce length/rate limits server-side.
- Add basic rate limits for sign-in-adjacent abuse where supported, post creation, comments, likes, follows, reports, and search.
- Do not log raw OAuth tokens, sensitive auth payloads, or unnecessary personal data.
- Establish retention rules for deleted content, reports, and moderation actions before production beta.
- Admin access must be granted through a controlled configuration path, never by a client-settable profile field.
- Account deletion must remove or anonymize associated data consistently and revoke the Clerk account/session.

## 11. Observability

Track enough to answer whether the core loop works:

- Auth success/failure and profile setup completion.
- Upload started/succeeded/failed, post creation success/failure, and orphan cleanup failures.
- Feed query latency/errors, pagination failures, and mutation errors.
- Follow, like, comment, report, block, and delete outcomes.
- App crashes and unhandled exceptions through the selected production monitoring tool.

Logs should use non-sensitive user IDs or anonymized identifiers where possible. Add alerts for repeated upload failures, elevated Convex errors, auth configuration failures, and moderation backlog once production monitoring is selected.

## 12. Testing And Quality Bar

### Automated coverage

- Convex authorization and validation tests for every entity write.
- Username uniqueness/normalization tests.
- Feed visibility tests for author, follower, non-follower, blocked, deleted, and suspended cases.
- Idempotency/duplicate-submission tests for posts, likes, comments, and follows.
- Profile setup and auth-routing tests.
- Create-post upload success/failure/retry tests with mocked storage behavior.
- Pagination, refresh, empty state, and error-state tests for the core screens.

### Manual device QA

- Android development build on at least one physical device and one emulator.
- Google sign-in and Apple sign-in configuration/behavior on supported environments.
- Camera/library permission denial and recovery.
- Slow network, interrupted upload, app backgrounding, and relaunch during an upload.
- Small and large screen sizes, keyboard behavior, safe areas, and accessibility labels.
- iOS smoke test before release even though Android is first.

### Definition of done for v1

- Core journeys work end-to-end against a deployed beta Convex environment.
- Authorization is enforced server-side and tested.
- No known data-loss path exists in post creation under normal retry/failure conditions.
- Lint and TypeScript checks pass; dependency and Expo diagnostics are clean or documented.
- EAS preview build is installable and the release checklist is complete.

## 13. Step-By-Step Implementation Phases

### Phase 0: Verify platform and integration contracts

- Confirm Expo SDK 57 compatibility requirements from current Expo docs.
- Confirm current Clerk Expo/React Native integration and Google/Apple provider setup.
- Confirm current Convex Clerk auth integration and file storage APIs.
- Choose exact dependency versions with Expo-compatible installation commands.
- Decide environment names, project IDs, bundle/package identifiers, and secret management.

Exit criteria: a written integration decision and local development environment can authenticate a test user and reach the intended Convex environment.

### Phase 1: App shell and authentication

- Establish root providers and auth-aware Expo Router route groups.
- Build auth screen with Google and Apple actions.
- Add loading, signed-out, signed-in, and auth-error states.
- Add sign-out and session restoration.

Exit criteria: a user can sign in/out and is routed correctly without social data yet.

### Phase 2: Convex schema and profile setup

- Add schema, indexes, validators, and authenticated profile queries/mutations.
- Add profile setup screen and username availability validation.
- Add profile and settings screens.
- Add avatar upload path if the chosen storage contract is ready.

Exit criteria: every authenticated user either has a valid profile or is forced through setup; duplicate usernames are impossible.

### Phase 3: Follow graph and profile discovery

- Add follow/unfollow mutations and visibility rules.
- Add username search and deterministic suggested people.
- Add profile page with counts and post grid placeholder/empty state.

Exit criteria: two test users can discover one another, follow/unfollow, and see correct counts and states.

### Phase 4: Image upload and post creation

- Implement image selection/camera permissions using current Expo APIs.
- Implement validation, preview, upload progress, post creation, cancellation/retry, and duplicate protection.
- Add post detail and delete-own-post behavior.

Exit criteria: an image can be published and retrieved after app restart without exposing it to unauthorized users.

### Phase 5: Feed and interactions

- Implement chronological cursor-paginated feed.
- Add like/unlike and comment create/delete.
- Add empty/error/loading states and refresh behavior.
- Add activity records and activity screen.

Exit criteria: the core social loop works across multiple users and devices with correct visibility.

### Phase 6: Safety and account lifecycle

- Implement block/unblock and enforce its semantics everywhere.
- Implement report creation and basic admin review/removal/suspension operations.
- Implement sign-out and confirmed account deletion with cleanup policy.
- Add server-side rate limits and moderation audit data.

Exit criteria: abuse and lifecycle paths are testable and do not depend on hidden client controls.

### Phase 7: Hardening and release

- Add automated coverage for authorization, retries, and visibility.
- Run physical-device QA, iOS smoke testing, Expo diagnostics, lint, and typecheck.
- Add production observability and error reporting.
- Produce EAS preview build, beta release checklist, rollback/update procedure, and privacy/support copy.

Exit criteria: release candidate meets the v1 definition of done.

## 14. Assumptions

These are defaults made because the interview did not specify a final value:

- ASSUMPTION: The first release is a private-network or invite-controlled beta even though account profiles are public within the app.
- ASSUMPTION: A post contains exactly one image and an optional caption.
- ASSUMPTION: Usernames are lowercase-normalized, unique, editable handles and are the primary search key.
- ASSUMPTION: Suggested people use a simple deterministic rule such as recent active users or users with shared follows; no recommendation model is needed.
- ASSUMPTION: Avatar and bio are optional during setup.
- ASSUMPTION: Feed visibility includes the author, even when the author does not follow themselves.
- ASSUMPTION: Counts are derived from relationship records or transactionally maintained counters, with the final performance choice deferred.
- ASSUMPTION: Convex file storage is sufficient for beta image media and no CDN/image transformation service is required initially.
- ASSUMPTION: In-app activity may be marked read, but exact unread interaction is deferred.
- ASSUMPTION: Admins use an internal/admin-only route or operational tooling rather than a polished public admin product.
- ASSUMPTION: There is no offline write queue; drafts are best-effort only.
- ASSUMPTION: The initial beta has modest traffic and does not require sharding, search infrastructure, or a separate event pipeline.

## 15. Open Risks And Decisions To Resolve Before Implementation

- Exact supported image MIME types, maximum file size, maximum dimensions, compression, and thumbnail strategy.
- Current Clerk and Convex package/API compatibility with Expo SDK 57 and React Native 0.86; verify against current documentation during Phase 0.
- Apple sign-in requirements for Android, iOS, development builds, and production credentials.
- Whether Convex storage URL generation and authorization meet the followers-only media requirement without accidental URL leakage.
- Exact block semantics: whether existing follows are removed, whether blocked users disappear from search, and whether old activity is hidden.
- Exact deletion semantics and retention for media, posts, comments, reports, and moderation audit history.
- Admin provisioning and credential/security model.
- Rate-limit thresholds, abuse response, and report retention.
- Username rules: allowed characters, length, reserved names, rename cooldown, and behavior when a username is changed.
- Caption, bio, comment, and display-name maximum lengths and content policy.
- Whether like/comment/follow activity is deduplicated, collapsed, or retained after unlike/unfollow.
- Production monitoring provider and alert thresholds.
- Beta access model, privacy policy, terms/support contact, and release distribution method.

## 16. Repository And Delivery Notes

- Existing app uses Expo `~57.0.26`, Expo Router `~57.0.24`, React Native `0.86.3`, and React `19.2.3`; recheck package files before implementation because dependency compatibility is version-sensitive.
- Use the repository's Bun workflow when `bun.lock` is present, while using Expo's dependency-resolution commands for Expo packages as required by `AGENTS.md`.
- Do not manually create or edit `ios/` or `android/` directories if Continuous Native Generation is in use.
- Keep route screens in `src/app/`; place reusable UI, hooks, validation, and data helpers outside the route directory.
- Each phase should land as a small, testable increment with the relevant schema, UI, authorization tests, and verification notes.

