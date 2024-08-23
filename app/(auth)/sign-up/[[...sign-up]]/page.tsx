import { SignUp } from "@clerk/nextjs";

export default function SignUpPage(){
  return(
    <main className="flex items-center justify-center min-h-screen bg-sky-500">
      <SignUp />
    </main>
  )
}