'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.scss';
import { IconAlertCircle } from '@tabler/icons-react';
import { Form, Formik, FormikHelpers } from 'formik';
import { withZodSchema } from 'formik-validator-zod';
import { z } from 'zod';
import { Alert, Button, Divider, PasswordInput, TextInput } from '@mantine/core';
import { AuthResponse, setAuth } from '@/helpers/auth';
import axios, { isSuccess } from '@/helpers/axios';
import { Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { getErrorCode, getErrorMessage, getMessageForCode } from '@/helpers/errors';

// Mirrors the API's user model, whose own validation messages are plain English rather than codes
const validationSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(4, 'Username must be at least 4 characters long')
      .max(40, 'Username must be at most 40 characters long'),
    email: z.string().min(1, 'Please enter your email').email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    passwordConfirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

type FormState = z.input<typeof validationSchema>;

// Errors the API reports about a single field, shown next to it rather than in the alert
const FIELD_ERRORS: Record<string, keyof FormState> = {
  USERNAME_TAKEN: 'username',
  UNIQUE_EMAIL: 'email',
};

const SignUp = () => {
  const router = useRouter();

  const handleSubmit = async (
    values: FormState,
    { setFieldError, setStatus }: FormikHelpers<FormState>
  ) => {
    setStatus(undefined);
    try {
      const res = await axios.post<AuthResponse>(endpoints.auth.signup, {
        ...values,
        username: values.username.trim(),
      });

      if (isSuccess(res)) {
        setAuth(res.data.token, res.data.data.user);
        router.replace(Routes.HOME);
      } else {
        setStatus(getMessageForCode(res.data.message));
      }
    } catch (err) {
      const field = FIELD_ERRORS[getErrorCode(err) ?? ''];
      if (field) {
        setFieldError(field, getErrorMessage(err));
      } else {
        setStatus(getErrorMessage(err));
      }
    }
  };

  return (
    <div className={styles.Layout}>
      <div className={styles.Box}>
        <h1>Sign up</h1>
        <Divider my={10} />
        <Formik<FormState>
          initialValues={{ username: '', email: '', password: '', passwordConfirm: '' }}
          validate={withZodSchema(validationSchema)}
          onSubmit={handleSubmit}
        >
          {({ errors, getFieldProps, isSubmitting, status, touched }) => {
            return (
              <Form>
                <TextInput
                  label="Username"
                  description="Between 4 and 40 characters"
                  placeholder="username"
                  autoComplete="username"
                  mb={10}
                  error={touched.username && errors.username}
                  {...getFieldProps('username')}
                />
                <TextInput
                  label="Email"
                  description="Please enter your email"
                  placeholder="example@email.com"
                  type="email"
                  autoComplete="email"
                  mb={10}
                  error={touched.email && errors.email}
                  {...getFieldProps('email')}
                />
                <PasswordInput
                  label="Password"
                  description="At least 8 characters"
                  placeholder="password"
                  autoComplete="new-password"
                  mb={10}
                  error={touched.password && errors.password}
                  {...getFieldProps('password')}
                />
                <PasswordInput
                  label="Confirm password"
                  description="Please enter your password again"
                  placeholder="password"
                  autoComplete="new-password"
                  error={touched.passwordConfirm && errors.passwordConfirm}
                  {...getFieldProps('passwordConfirm')}
                />
                {status && (
                  <Alert mt={10} color="red" icon={<IconAlertCircle />}>
                    {status}
                  </Alert>
                )}
                <Button mt={10} fullWidth type="submit" loading={isSubmitting}>
                  Sign up
                </Button>
              </Form>
            );
          }}
        </Formik>
        <p>
          Already have an account? <Link href={Routes.LOGIN}>Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
