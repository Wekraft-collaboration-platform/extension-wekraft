# GitPilot — User Flow

This document traces every path a user takes through the GitPilot VS Code extension, from first install to daily developer workflow.

---

## 1. High-Level Journey

```mermaid
flowchart TD
    A([👤 Developer]) --> B[Installs GitPilot\nfrom VS Code Marketplace]
    B --> C[Opens VS Code\nGitPilot icon appears on Activity Bar]
    C --> D{Already signed\nin to GitHub?}
    D -- No  --> E[Click 'Sign in with GitHub']
    D -- Yes --> F[Silent session restore]
    E --> G[VS Code native\nGitHub OAuth popup]
    G --> H{Auth successful?}
    H -- No  --> E
    H -- Yes --> I[Fetch GitHub profile\nGET /user]
    F --> I
    I --> J[Register or update user\nin Convex users table]
    J --> K[Load user deadlines\nfrom Convex]
    K --> L[Render Repos Panel\non right sidebar]
    L --> M{User action}
    M --> N[Set deadline]
    M --> O[Manage todos]
    M --> P[Inspect commits]
    M --> Q[Run pre-push check]
    N & O --> R[(Convex DB cloud storage)]
    P --> S[(GitHub API)]
    Q --> T[Local git CLI]
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant UI  as GitPilot Sidebar
    participant VSC as VS Code Auth
    participant GH  as GitHub API
    participant CX  as Convex DB

    Dev  ->> UI  : Click Sign in with GitHub
    UI   ->> VSC : getSession github scopes createIfNone true
    VSC  ->> Dev : Show GitHub OAuth popup
    Dev  ->> VSC : Authorise GitPilot
    VSC -->> UI  : AuthenticationSession accessToken

    UI   ->> GH  : GET /user Bearer token
    GH  -->> UI  : id login name email avatar_url

    UI   ->> CX  : mutation users:registerOrGet profile
    Note over CX : Upsert by github_id — new users get plan free
    CX  -->> UI  : ConvexUser _id plan

    UI   ->> CX  : query deadlines:list userId
    CX  -->> UI  : Deadline array

    UI  -->> Dev : Repos and deadlines rendered
```

---

## 3. Deadline Tracking Flow

```mermaid
flowchart LR
    A[User clicks a repo] --> B[View repo detail]
    B --> C[Pick deadline datetime]
    C --> D{Free plan?}
    D -- Yes under 3 --> E[deadlineManager.setDeadline]
    D -- Yes at limit --> F[Show upgrade prompt]
    D -- Pro plan --> E
    E --> G[Update in-memory cache instantly]
    G --> H[Write to Convex deadlines:upsert]
    H --> I[Badge shown on repo]
    I --> J{Overdue?}
    J -- Yes --> K[Red Overdue badge]
    J -- No  --> L[Green Xd left badge]
```

---

## 4. Todo Workflow

```mermaid
stateDiagram-v2
    [*]         --> open        : createTodo
    open        --> in-progress : Check partial
    open        --> done        : Check complete
    in-progress --> done        : Check complete
    done        --> open        : Uncheck
    open        --> [*]         : Delete
    in-progress --> [*]         : Delete
    done        --> [*]         : Delete
```

---

## 5. Pre-Push Security Check Flow

```mermaid
flowchart TD
    A[Developer runs git push] --> B[pre-push git hook fires]
    B --> C[node .gitpilot/prepush-runtime.cjs]
    C --> D[git diff upstream...HEAD]
    D --> E[Scan added lines for secret patterns]
    E --> F{Secrets found?}
    F -- No  --> G[Log push stats — Exit 0]
    F -- Yes --> H{GITPILOT_ALLOW_PUSH=1?}
    H -- Yes --> G
    H -- No  --> I[Push BLOCKED — Exit 1]
    I --> J[Developer reviews prepush-report.json]
    J --> K[Fix secrets or set override]
    K --> A
```

---

## 6. Data Persistence Model

```mermaid
flowchart LR
    subgraph ExtHost["Extension Host"]
        A[sidebarProvider]
        B[deadlineManager — in-memory Map]
        C[todoManager — in-memory Map]
    end

    subgraph Convex["Convex Cloud"]
        D[(users)]
        E[(deadlines)]
        F[(todos)]
    end

    subgraph VSCode["VS Code"]
        G[globalState — cache snapshot]
    end

    A --> B
    A --> C
    B <-->|upsert on change / list on login| E
    C <-->|create update delete| F
    A --> D
    B -->|persist snapshot| G
    G -->|hydrate on restart| B
```

---

## 7. Plan Limits Enforcement

```mermaid
flowchart TD
    A[User action] --> B{Check plan}
    B -- free --> C{Action type}
    B -- pro  --> D[Always allowed]
    C -- deadline --> E{Count less than 3?}
    C -- todo     --> F{Count less than 10?}
    E -- Yes --> G[Allowed — save to Convex]
    E -- No  --> H[Show upgrade prompt]
    F -- Yes --> G
    F -- No  --> H
    H --> I[Link to wekraft.xyz/upgrade]
```
