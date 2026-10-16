'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './styles.module.scss';
import { IconAlertCircle } from '@tabler/icons-react';
import { Form, Formik, FormikHelpers } from 'formik';
import { withZodSchema } from 'formik-validator-zod';
import { z } from 'zod';
import { Alert, Button, Divider, PasswordInput, TextInput } from '@mantine/core';
import { AuthUser, safeRedirect, setAuth } from '@/helpers/auth';
import axios, { APIResponse, isSuccess } from '@/helpers/axios';
import { Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { getErrorMessage, getMessageForCode } from '@/helpers/errors';

const validationSchema = z.object({
  email: z.string().min(1, 'Please enter your email').email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password'),
});

type FormState = {
  email: string;
  password: string;
};
type LoginData = {
  user: AuthUser;
};
type LoginResponse = APIResponse<LoginData> & { token: string };

const Login = () => {
  const router = useRouter();

  const handleSubmit = async (values: FormState, { setStatus }: FormikHelpers<FormState>) => {
    setStatus(undefined);
    try {
      const res = await axios.post<LoginResponse>(endpoints.auth.login, values);

      if (isSuccess(res)) {
        setAuth(res.data.token, res.data.data.user);
        // Back to the page middleware.ts sent them here from, if any
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        router.replace(safeRedirect(redirect));
      } else {
        setStatus(getMessageForCode(res.data.message));
      }
    } catch (err) {
      setStatus(getErrorMessage(err));
    }
  };

  return (
    <div className={styles.Layout}>
      <div className={styles.Box}>
        <h1>Login</h1>
        <Divider my={10} />
        <Formik
          initialValues={{ email: '', password: '' }}
          validate={withZodSchema(validationSchema)}
          onSubmit={handleSubmit}
        >
          {({ errors, getFieldProps, isSubmitting, status, touched }) => {
            return (
              <Form>
                <TextInput
                  label="Email"
                  description="Please enter your email"
                  placeholder="example@email.com"
                  mb={10}
                  error={touched.email && errors.email}
                  {...getFieldProps('email')}
                />
                <PasswordInput
                  label="Password"
                  description="Please enter your password"
                  placeholder="password"
                  error={touched.password && errors.password}
                  {...getFieldProps('password')}
                />
                {status && (
                  <Alert mt={10} color="red" icon={<IconAlertCircle />}>
                    {status}
                  </Alert>
                )}
                <Button mt={10} fullWidth type="submit" loading={isSubmitting}>
                  Login
                </Button>
              </Form>
            );
          }}
        </Formik>
        <p>
          Don't have an account? <Link href={Routes.SIGN_UP}>Sign up!</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
