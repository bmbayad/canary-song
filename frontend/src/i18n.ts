import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      // Auth
      'auth.login': 'Login',
      'auth.register': 'Register',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.firstName': 'First Name',
      'auth.lastName': 'Last Name',
      'auth.loginButton': 'Sign In',
      'auth.registerButton': 'Create Account',
      'auth.googleSignIn': 'Sign in with Google',
      'auth.noAccount': "Don't have an account? Register",
      'auth.haveAccount': 'Already have an account? Login',
      'auth.logout': 'Logout',
      'auth.invalidCredentials': 'Invalid email or password',
      'auth.emailExists': 'Email already registered',

      // Navigation
      'nav.dashboard': 'Dashboard',
      'nav.myBirds': 'My Birds',
      'nav.uploadRecording': 'Upload Recording',
      'nav.myEvaluations': 'My Evaluations',
      'nav.profile': 'Profile',
      'nav.judges': 'Judges',
      'nav.administration': 'Administration',

      // Common
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.close': 'Close',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
    }
  },
  ar: {
    translation: {
      // Auth
      'auth.login': 'تسجيل الدخول',
      'auth.register': 'تسجيل',
      'auth.email': 'البريد الإلكتروني',
      'auth.password': 'كلمة المرور',
      'auth.firstName': 'الاسم الأول',
      'auth.lastName': 'اسم العائلة',
      'auth.loginButton': 'تسجيل الدخول',
      'auth.registerButton': 'إنشاء حساب',
      'auth.googleSignIn': 'تسجيل الدخول باستخدام Google',
      'auth.noAccount': 'ليس لديك حساب؟ سجل',
      'auth.haveAccount': 'هل لديك حساب بالفعل؟ تسجيل الدخول',
      'auth.logout': 'تسجيل الخروج',
      'auth.invalidCredentials': 'بريد إلكتروني أو كلمة مرور غير صحيحة',
      'auth.emailExists': 'البريد الإلكتروني مسجل بالفعل',

      // Navigation
      'nav.dashboard': 'لوحة التحكم',
      'nav.myBirds': 'طيوري',
      'nav.uploadRecording': 'تحميل التسجيل',
      'nav.myEvaluations': 'تقييماتي',
      'nav.profile': 'الملف الشخصي',
      'nav.judges': 'القضاة',
      'nav.administration': 'الإدارة',

      // Common
      'common.save': 'حفظ',
      'common.cancel': 'إلغاء',
      'common.delete': 'حذف',
      'common.edit': 'تعديل',
      'common.close': 'إغلاق',
      'common.loading': 'جاري التحميل...',
      'common.error': 'خطأ',
      'common.success': 'نجح',
    }
  },
  fr: {
    translation: {
      // Auth
      'auth.login': 'Connexion',
      'auth.register': 'Inscription',
      'auth.email': 'E-mail',
      'auth.password': 'Mot de passe',
      'auth.firstName': 'Prénom',
      'auth.lastName': 'Nom',
      'auth.loginButton': 'Se connecter',
      'auth.registerButton': 'Créer un compte',
      'auth.googleSignIn': 'Se connecter avec Google',
      'auth.noAccount': "Pas de compte ? S'inscrire",
      'auth.haveAccount': 'Vous avez déjà un compte ? Connexion',
      'auth.logout': 'Déconnexion',
      'auth.invalidCredentials': 'Email ou mot de passe invalide',
      'auth.emailExists': 'Email déjà enregistré',

      // Navigation
      'nav.dashboard': 'Tableau de bord',
      'nav.myBirds': 'Mes oiseaux',
      'nav.uploadRecording': 'Télécharger un enregistrement',
      'nav.myEvaluations': 'Mes évaluations',
      'nav.profile': 'Profil',
      'nav.judges': 'Juges',
      'nav.administration': 'Administration',

      // Common
      'common.save': 'Enregistrer',
      'common.cancel': 'Annuler',
      'common.delete': 'Supprimer',
      'common.edit': 'Modifier',
      'common.close': 'Fermer',
      'common.loading': 'Chargement...',
      'common.error': 'Erreur',
      'common.success': 'Succès',
    }
  },
  es: {
    translation: {
      // Auth
      'auth.login': 'Iniciar sesión',
      'auth.register': 'Registro',
      'auth.email': 'Correo electrónico',
      'auth.password': 'Contraseña',
      'auth.firstName': 'Nombre',
      'auth.lastName': 'Apellido',
      'auth.loginButton': 'Iniciar sesión',
      'auth.registerButton': 'Crear cuenta',
      'auth.googleSignIn': 'Iniciar sesión con Google',
      'auth.noAccount': '¿No tienes cuenta? Regístrate',
      'auth.haveAccount': '¿Ya tienes cuenta? Inicia sesión',
      'auth.logout': 'Cerrar sesión',
      'auth.invalidCredentials': 'Correo electrónico o contraseña no válidos',
      'auth.emailExists': 'El correo electrónico ya está registrado',

      // Navigation
      'nav.dashboard': 'Panel de control',
      'nav.myBirds': 'Mis pájaros',
      'nav.uploadRecording': 'Cargar grabación',
      'nav.myEvaluations': 'Mis evaluaciones',
      'nav.profile': 'Perfil',
      'nav.judges': 'Jueces',
      'nav.administration': 'Administración',

      // Common
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.delete': 'Eliminar',
      'common.edit': 'Editar',
      'common.close': 'Cerrar',
      'common.loading': 'Cargando...',
      'common.error': 'Error',
      'common.success': 'Éxito',
    }
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
