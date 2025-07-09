import { whoAmI } from "../setUpLayout";


let notificationWS: WebSocket | null = null;

export async function connectNotifications(): Promise<WebSocket | null> {
  const user = await whoAmI();
  if (!user.success) {
    console.warn('User is not authenticated, cannot connect to notifications WebSocket');
    return null;
  }
  const userId = user.data.id;
  
  if (notificationWS && notificationWS.readyState === WebSocket.OPEN) {
    return notificationWS;
  }

  if (notificationWS) {
    notificationWS.close();
    notificationWS = null;
  }

  try {
    notificationWS = new WebSocket(
      `wss://${location.host}/notifications/ws?userId=${userId}`
    );

    notificationWS.onopen = () => {
      console.log('Notifications WebSocket connected');
    };

    notificationWS.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log('WebSocket message received:', msg);
    };

    notificationWS.onclose = (event) => {
      console.log('Notifications WebSocket closed:', event.code, event.reason);
      notificationWS = null;

      if (event.code !== 1000) {
        setTimeout(() => connectNotifications(), 5000);
      }
    };

    notificationWS.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return notificationWS;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    return null;
  }
}

export function disconnectNotifications(): void {
  if (notificationWS) {
    notificationWS.close(1000, 'User logout');
    notificationWS = null;
  }
}