import dynamic from 'next/dynamic';

const NotificationsClient = dynamic(() => import('./notifications-client'), { ssr: false });

export default function Page() {
  return <NotificationsClient />;
}
