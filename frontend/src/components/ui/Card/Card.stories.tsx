import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your plan.</CardDescription>
      </CardHeader>
      <CardContent>Content blocks go here.</CardContent>
      <CardFooter>Footer actions</CardFooter>
    </Card>
  ),
};
