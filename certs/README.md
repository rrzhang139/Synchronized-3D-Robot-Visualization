# SSL Certificates for WebSocket Secure (WSS) Connection

This directory is where SSL certificates should be placed for enabling secure WebSocket connections.

## Generating Self-Signed Certificates for Development

Run the following command from the project root to generate self-signed certificates for development:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem
```

When prompted, fill in the required information. For the Common Name (CN), use `localhost` for local development.

## Trusting Self-Signed Certificates in Browser

For development, you'll need to trust the self-signed certificate in your browser:

1. Open your browser and navigate to `https://localhost:8000`
2. You'll see a security warning - proceed to the site anyway
3. In most browsers, you can view the certificate and add it to your trusted certificates

## Production Certificates

For production, you should use proper SSL certificates issued by a trusted certificate authority like Let's Encrypt.

**Note:** Never commit your SSL certificates to version control. Make sure to add them to your `.gitignore` file.