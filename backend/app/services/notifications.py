from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request
from email.message import EmailMessage

import smtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    *,
    recipient: str,
    subject: str,
    body: str,
) -> bool:
    """
    Send an email notification through the configured SMTP server.

    Returns True when the message was sent successfully.
    Returns False when SMTP is disabled or delivery fails.
    """

    if not settings.smtp_enabled:
        logger.info("SMTP notifications are disabled.")
        return False

    if not settings.smtp_host:
        logger.warning("SMTP is enabled but smtp_host is not configured.")
        return False

    if not settings.smtp_from_email:
        logger.warning(
            "SMTP is enabled but smtp_from_email is not configured."
        )
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=15,
        ) as server:
            if settings.smtp_use_tls:
                server.starttls()

            if settings.smtp_username:
                server.login(
                    settings.smtp_username,
                    settings.smtp_password,
                )

            server.send_message(message)

        logger.info("Email notification sent to %s.", recipient)
        return True

    except Exception:
        logger.exception(
            "Failed to send email notification to %s.",
            recipient,
        )
        return False


def send_telegram(
    *,
    message: str,
) -> bool:
    """
    Send a Telegram notification through the configured bot.

    Returns True when the message was sent successfully.
    Returns False when Telegram is disabled or delivery fails.
    """

    if not settings.telegram_enabled:
        logger.info("Telegram notifications are disabled.")
        return False

    if not settings.telegram_bot_token:
        logger.warning(
            "Telegram is enabled but telegram_bot_token is not configured."
        )
        return False

    if not settings.telegram_chat_id:
        logger.warning(
            "Telegram is enabled but telegram_chat_id is not configured."
        )
        return False

    url = (
        "https://api.telegram.org/bot"
        f"{settings.telegram_bot_token}/sendMessage"
    )

    payload = urllib.parse.urlencode(
        {
            "chat_id": settings.telegram_chat_id,
            "text": message,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=15,
        ) as response:
            response_body = response.read().decode("utf-8")

        result = json.loads(response_body)

        if not result.get("ok"):
            logger.warning(
                "Telegram API rejected notification: %s",
                result,
            )
            return False

        logger.info("Telegram notification sent.")
        return True

    except Exception:
        logger.exception(
            "Failed to send Telegram notification."
        )
        return False


def send_notification(
    *,
    email_recipient: str | None,
    email_subject: str,
    email_body: str,
    telegram_message: str,
) -> dict[str, bool]:
    """
    Send the same notification through all configured channels.

    Channels that are disabled or unavailable return False.
    """

    email_sent = False
    telegram_sent = False

    if email_recipient:
        email_sent = send_email(
            recipient=email_recipient,
            subject=email_subject,
            body=email_body,
        )

    telegram_sent = send_telegram(
        message=telegram_message,
    )

    return {
        "email_sent": email_sent,
        "telegram_sent": telegram_sent,
    }