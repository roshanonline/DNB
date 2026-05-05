"""
WebSocket Consumer for Real-Time Notice Notifications
Clients connect to: ws://localhost:8000/ws/notifications/?token=<JWT>
All connected clients join the 'notices' group and receive broadcasts.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model


User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    try:
        UntypedToken(token_str)
        from rest_framework_simplejwt.backends import TokenBackend
        from django.conf import settings
        data = TokenBackend(
            algorithm='HS256',
            signing_key=settings.SECRET_KEY
        ).decode(token_str, verify=True)
        return User.objects.get(id=data['user_id'])
    except Exception:
        return None


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Authenticate via query string token
        query_string = self.scope.get('query_string', b'').decode()
        token_str = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token_str = param.split('=', 1)[1]
                break

        self.user = None
        if token_str:
            self.user = await get_user_from_token(token_str)

        if not self.user:
            await self.close()
            return

        # Join global notices group
        await self.channel_layer.group_add('notices', self.channel_name)

        # Join department-specific group
        dept_group = f'dept_{self.user.department}'
        await self.channel_layer.group_add(dept_group, self.channel_name)

        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': f'Connected as {self.user.username}',
            'user_id': self.user.id,
            'department': self.user.department,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard('notices', self.channel_name)
        if self.user:
            dept_group = f'dept_{self.user.department}'
            await self.channel_layer.group_discard(dept_group, self.channel_name)

    async def receive(self, text_data):
        """Handle messages from client (ping/pong support)."""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except Exception:
            pass

    # ── Group message handlers ─────────────────────────────────────────

    async def notice_message(self, event):
        """Broadcast notice events to this client."""
        await self.send(text_data=json.dumps(event.get('data', {})))
