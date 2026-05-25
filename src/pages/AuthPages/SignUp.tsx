import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Criar conta | Premify"
        description="Crie sua conta Premify e experimente o trial completo de 15 dias."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
