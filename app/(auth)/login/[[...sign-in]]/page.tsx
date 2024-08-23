import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return(
    <main className="flex items-center justify-center min-h-screen bg-sky-500">
      <SignIn />
    </main>
  )
}