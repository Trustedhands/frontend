function required(name: string, value: string | undefined): string {
  if (!value)
    throw new Error(`Missing environment variable ${name}. See apps/client/.env.example.`);
  return value;
}

// Referenced literally so Next can inline them at build time
export const env = {
  apiUrl: required('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL),
};
