'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { registerSchema, type RegisterSchema } from '@/schemas/auth.schema';
import { registerAction } from '@/actions/auth.actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterSchema) => {
    setServerError(null);
    const result = await registerAction(data);

    if (!result || !result.success) {
      setServerError(result?.error ?? 'Erro inesperado. Tente novamente.');
      return;
    }

    router.push('/login?registered=true');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Input
        id="name"
        type="text"
        label="Nome completo"
        placeholder="João Silva"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        id="email"
        type="email"
        label="E-mail"
        placeholder="seu@email.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        id="password"
        type="password"
        label="Senha"
        placeholder="••••••••"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        id="confirmPassword"
        type="password"
        label="Confirmar senha"
        placeholder="••••••••"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
      )}

      <Button type="submit" loading={isSubmitting} className="mt-2">
        Criar conta
      </Button>

      <p className="text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
