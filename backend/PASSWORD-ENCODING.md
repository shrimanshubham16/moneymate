# 🔐 Password Encoding for Connection String

## ⚠️ Important: Spaces in Password

If your database password contains **spaces** or other special characters, you need to **URL-encode** them in the connection string.

## 🚀 Quick Solution

### Option 1: Use the Helper Script

```bash
cd backend
npm run encode-password
```

Enter your password when prompted, and it will show you the encoded version.

### Option 2: Manual Encoding

**Common encodings:**
- Space ` ` → `%20`
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`

**Example:**
- Password: `my password 123`
- Encoded: `my%20password%20123`

### Option 3: Online Encoder

Use an online URL encoder:
1. Go to https://www.urlencoder.org/
2. Paste your password
3. Copy the encoded result

## 📝 Update Your .env File

Once you have the encoded password, update your `.env` file:

```bash
SUPABASE_CONNECTION_STRING=postgresql://postgres.lvwpurwrktdblctzwctr:[ENCODED-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

Replace `[ENCODED-PASSWORD]` with your URL-encoded password.

## ✅ Example

**Original password:** `my password with spaces`

**Encoded password:** `my%20password%20with%20spaces`

**Connection string:**
```
postgresql://postgres.lvwpurwrktdblctzwctr:my%20password%20with%20spaces@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

---

**Note:** The connection string in `.env` should use the **encoded** password, not the original password with spaces.



