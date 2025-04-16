import classes from './Welcome.module.scss';
import { Text, Title } from '@mantine/core';

export function Welcome() {
  return (
    <>
      <Title className={classes.title} ta="center" mt={100}>
        Welcome to
        <br />
        <Text
          inherit
          variant="gradient"
          component="span"
          gradient={{ from: 'lightgreen', to: 'lime' }}
        >
          My Recipe Book
        </Text>
      </Title>
    </>
  );
}
