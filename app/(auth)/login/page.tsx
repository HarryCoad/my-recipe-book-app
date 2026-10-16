'use client';

import styles from './styles.module.scss';
import { Form, Formik, FormikHelpers } from 'formik';
import { withZodSchema } from 'formik-validator-zod';
import { z } from 'zod';
import { Button, Divider, PasswordInput, TextInput } from '@mantine/core';
import axios, { APIResponse, isSuccess } from '@/helpers/axios';
import { endpoints } from '@/helpers/endpoints';

const validationSchema = z.object({
  email: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(25, 'Name should be at most 25 characters long'),
  password: z
    .string()
    .min(8, 'Password should be at least 8 characters long')
    .max(16, 'Password should be at most 16 characters long'),
});

type FormState = {
  email: string;
  password: string;
};
type LoginData = {
  user: {
    username: string;
    email: string;
    photo: string;
  };
};
type LoginResponse = APIResponse<LoginData> & { token: string };

const Login = () => {
  const handleSubmit = async (values: FormState, helpers: FormikHelpers<FormState>) => {
    try {
      // Submit form
      const res = await axios.post<LoginResponse>(endpoints.auth.login, values);

      if (isSuccess(res)) {
        console.log(res.data.token);
      }
      // Save token to cookie

      // Route to dashboard
    } catch (err) {
      // handle submission error for validation
      // handle general error
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
          {({ errors, getFieldProps, touched }) => {
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
                <Button mt={10} fullWidth type="submit">
                  Login
                </Button>
              </Form>
            );
          }}
        </Formik>
        <p>
          Don't have an account? <span>Sign up!</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
