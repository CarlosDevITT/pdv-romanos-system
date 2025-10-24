import { supabase } from "./supabase.js";

// Exibe alertas
function showMessage(icon, title, text) {
  Swal.fire({
    icon,
    title,
    text,
    timer: 3000,
    showConfirmButton: false
  });
}

// Verifica sessão
export async function checkAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    console.warn("[Auth] Sessão inválida");
    window.location.href = "./views/SignIn.html";
    return false;
  }
  console.log("[Auth] Usuário logado:", data.session.user.email);
  return true;
}

// Login
export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return showMessage("info", "Email não confirmado", "Verifique seu email antes de logar.");
    }
    return showMessage("error", "Erro no login", error.message);
  }
  showMessage("success", "Sucesso!", "Login realizado com sucesso.");
  setTimeout(() => window.location.href = "../index.html", 1500);
}

// Registro
export async function register(name, email, password) {
  if (password.length < 6) {
    return showMessage("error", "Senha muito curta", "A senha deve ter pelo menos 6 caracteres.");
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: window.location.origin
    }
  });
  if (error) return showMessage("error", "Erro no cadastro", error.message);

  showMessage("success", "Sucesso!", "Cadastro realizado. Verifique seu email para confirmação.");
}

// Login social
export async function loginWithProvider(provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin }
  });
  if (error) return showMessage("error", `Erro no login com ${provider}`, error.message);
}

// Logout
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "./views/SignIn.html";
}
