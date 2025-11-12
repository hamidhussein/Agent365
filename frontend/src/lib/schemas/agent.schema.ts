import { z } from 'zod';
import { AgentCategory } from '@/lib/types';

export const agentExecutionSchema = z.object({
  inputs: z
    .record(z.any())
    .refine(
      (data) => Object.keys(data).length > 0,
      'At least one input is required'
    ),
});

export const createAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be at most 500 characters'),
  long_description: z
    .string()
    .max(5000, 'Long description must be at most 5000 characters')
    .optional(),
  category: z.nativeEnum(AgentCategory, {
    errorMap: () => ({ message: 'Please select a valid category' }),
  }),
  tags: z
    .array(z.string().min(1, 'Tags cannot be empty'))
    .min(1, 'At least one tag is required')
    .max(10, 'Maximum 10 tags allowed'),
  price_per_run: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(1, 'Price must be at least 1 credit')
    .max(10000, 'Price cannot exceed 10,000 credits'),
  config: z.object({
    model: z.string().min(1, 'Model is required'),
    temperature: z
      .number({ invalid_type_error: 'Temperature must be a number' })
      .min(0, 'Minimum temperature is 0')
      .max(2, 'Maximum temperature is 2'),
    max_tokens: z
      .number({ invalid_type_error: 'Max tokens must be a number' })
      .min(100, 'Minimum 100 tokens')
      .max(32000, 'Cannot exceed 32,000 tokens'),
    timeout_seconds: z
      .number({ invalid_type_error: 'Timeout must be a number' })
      .min(10, 'Timeout must be at least 10 seconds')
      .max(300, 'Timeout cannot exceed 300 seconds'),
  }),
  demo_available: z.boolean().default(false),
});

export type AgentExecutionFormData = z.infer<typeof agentExecutionSchema>;
export type CreateAgentFormData = z.infer<typeof createAgentSchema>;
