"""
Mail service.

Sends the 6-digit verification codes used during signup and
password reset. Uses Flask-Mail, configured from .env.
"""

from flask_mail import Mail, Message

mail = Mail()


def send_verification_email(to_email: str, username: str, code: str) -> bool:
    """Send a signup verification code. Returns True if sent successfully."""
    try:
        msg = Message(
            subject="LabWise — Your Verification Code",
            recipients=[to_email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                        background: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 12px;">
                <h2 style="color: #4ade80; margin-bottom: 8px;">⚗️ LabWise</h2>
                <p style="color: #94a3b8; margin-bottom: 24px;">Virtual Physics Laboratory</p>
                <p>Hello <strong>{username}</strong>,</p>
                <p>Your verification code is:</p>
                <div style="background: #1a2540; border: 2px solid #4ade80; border-radius: 8px;
                            padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px;
                                 color: #4ade80; font-family: monospace;">{code}</span>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">
                    This code expires in <strong>15 minutes</strong>.<br>
                    If you did not request this, please ignore this email.
                </p>
            </div>
            """
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email error (verification): {e}")
        return False


def send_password_reset_email(to_email: str, username: str, code: str) -> bool:
    """Send a password reset code. Returns True if sent successfully."""
    try:
        msg = Message(
            subject="LabWise — Password Reset Code",
            recipients=[to_email],
            html=f"""
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                        background: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 12px;">
                <h2 style="color: #4ade80;">⚗️ LabWise — Password Reset</h2>
                <p>Hello <strong>{username}</strong>,</p>
                <p>Your password reset code is:</p>
                <div style="background: #1a2540; border: 2px solid #f59e0b; border-radius: 8px;
                            padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px;
                                 color: #f59e0b; font-family: monospace;">{code}</span>
                </div>
                <p style="color: #94a3b8; font-size: 13px;">
                    This code expires in <strong>15 minutes</strong>.<br>
                    If you did not request this, please ignore this email — your
                    password will remain unchanged.
                </p>
            </div>
            """
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email error (password reset): {e}")
        return False
