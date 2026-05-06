'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redireciona automaticamente para o dashboard
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <div className="text-center">
        <div className="flex flex-col items-center justify-center mb-6">
          <img
            src="/logo-monarca.png"
            alt="Logo Barbearia Monarca"
            className="h-24 w-24 rounded-lg shadow-lg object-cover mb-4"
          />
          <h1 className="text-5xl font-bold text-gray-900">
            Barbearia Monarca
          </h1>
        </div>
        <p className="text-lg text-gray-600 mb-8">
          Sistema de Gestão para Barbearias - Excelência em cuidados masculinos
        </p>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-4">
          Redirecionando para o painel...
        </p>
      </div>
    </div>
  );
}
