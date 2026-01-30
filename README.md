# Result Viewer

A secure, client-side dashbood for viewing encrypted student results.

## Setup

1.  **Dependencies**: No build process required (uses Vanilla JS and CSS).
2.  **Chart.js**: Included via CDN in `index.html`.

## Usage

The application requires `public_key` and `private_key` URL parameters.

URL format:
```
index.html?public_key={FILENAME}&private_key={PASSWORD}
```

- `public_key`: Corresponds to the filename in `assets/analysis/` (e.g. `student1`).
- `private_key`: The AES-256 password used to decrypt the file.

## Testing

1.  Generate test data:
    ```bash
    node scripts/create_test_data.js
    ```
    This creates `assets/analysis/student_test` encrypted with password `my_secret_password_123`.

2.  Open in browser:
    ```
    index.html?public_key=student_test&private_key=my_secret_password_123
    ```

## Development

- `js/app.js`: Main logic.
- `js/encryption-utils.js`: AES-GCM/CBC decryption logic (Dart compatible).
- `style.css`: Styling.
