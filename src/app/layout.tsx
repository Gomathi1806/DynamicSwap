import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';

const Providers = dynamic(() => import('@/components/Providers').then(mod => mod.Providers), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'DynamicSwap | Dynamic Fee Protection',
  description: 'Uniswap V4 Hook with volatility-based dynamic fees (0.30% - 1.00%)',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
