# app-taxjar

## 1.1.7

### Patch Changes

- Updated dependencies [e7b909ed]
  - @saleor/sentry-utils@0.1.0

## 1.1.6

### Patch Changes

- 64d88b24: Update packages to ESM. See node [docs](https://nodejs.org/api/esm.html) for more info.
- 5cbd3b63: Updated @saleor/app-sdk package to 0.50.1
- Updated dependencies [64d88b24]
- Updated dependencies [5cbd3b63]
- Updated dependencies [e1ea31be]
  - @saleor/react-hook-form-macaw@0.2.7
  - @saleor/apps-logger@1.2.6
  - @saleor/apps-shared@1.10.3
  - @saleor/apps-otel@1.2.0
  - @saleor/apps-ui@1.2.5

## 1.1.5

### Patch Changes

- 4ffef6be: Update `@sentry/nextjs` to 8.0.0 version. It should help us with attaching additional data to Sentry errors.
- 2604ce1e: Updated Next.js to 14.2.3
- Updated dependencies [4ffef6be]
- Updated dependencies [2604ce1e]
  - @saleor/apps-logger@1.2.5
  - @saleor/apps-shared@1.10.2
  - @saleor/apps-ui@1.2.4
  - @saleor/apps-otel@1.1.0
  - @saleor/react-hook-form-macaw@0.2.6

## 1.1.4

### Patch Changes

- Updated dependencies [eec25524]
  - @saleor/apps-logger@1.2.4

## 1.1.3

### Patch Changes

- Updated dependencies [528b981e]
  - @saleor/apps-logger@1.2.3

## 1.1.2

### Patch Changes

- f22f2b8a: Combine `APP_LOG_LEVEL` variable for `pino` & `tslog` libraries. After this change `APP_LOG_LEVEL` will take string which is one of `silent | trace | debug | info | warn | error | fatal`.
- Updated dependencies [f22f2b8a]
- Updated dependencies [df03c571]
  - @saleor/apps-logger@1.2.2
  - @saleor/apps-shared@1.10.1

## 1.1.1

### Patch Changes

- Updated dependencies [0a441ac9]
- Updated dependencies [f7ecb7bd]
  - @saleor/apps-logger@1.2.1

## 1.1.0

### Minor Changes

- b29318a2: Currently, Dashboard requires from a user to have "MANAGE_APPS" to have access to the apps tab.
  Since the release 3.20 Dashboard will allow all users to access to apps tabs without checking permission.
  This means that apps will be checking if the user has "MANAGE_APPS" internally and show message "You do not have permission to access this page" if the user does not have the permission.

### Patch Changes

- Updated dependencies [b29318a2]
  - @saleor/apps-shared@1.10.0

## 1.0.3

### Patch Changes

- 29d10d4a: Update Next.js to version 14.1.0.
- Updated dependencies [29d10d4a]
  - @saleor/apps-shared@1.9.4
  - @saleor/apps-ui@1.2.3
  - @saleor/apps-logger@1.2.0
  - @saleor/apps-otel@1.1.0
  - @saleor/react-hook-form-macaw@0.2.6

## 1.0.2

### Patch Changes

- Updated dependencies [1e07a6ff]
  - @saleor/apps-logger@1.2.0

## 1.0.1

### Patch Changes

- 67afe8e4: Apps that use OTEL can now collect and send spans containing details about GraphQL requests.
- Updated dependencies [67afe8e4]
- Updated dependencies [67afe8e4]
  - @saleor/apps-shared@1.9.3
  - @saleor/apps-otel@1.1.0

## 1.0.0

### Major Changes

- af4ad5c: Extracted Taxjar App from Taxes app. Now app is standalone app just for Taxjar. Code for Avatax was removed. Avatax app is accessible in its dedicated Avatax app now.
