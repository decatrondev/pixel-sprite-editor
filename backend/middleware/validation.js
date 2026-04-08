// Validación de inputs con Zod

const { z } = require('zod');

const registerSchema = z.object({
    username: z.string()
        .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
        .max(50, 'El nombre de usuario no puede exceder 50 caracteres')
        .regex(/^[a-zA-Z0-9_-]+$/, 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'),
    email: z.string()
        .email('Email inválido')
        .max(100, 'El email no puede exceder 100 caracteres'),
    password: z.string()
        .min(8, 'La contraseña debe tener al menos 8 caracteres')
        .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
        .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
        .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
    password2: z.string()
}).refine(data => data.password === data.password2, {
    message: 'Las contraseñas no coinciden',
    path: ['password2']
});

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'La contraseña es requerida')
});

const spriteProjectSchema = z.object({
    projectName: z.string().min(1).max(100).optional(),
    jsonData: z.string().optional(),
    isUpdate: z.any().optional(),
    projectId: z.any().optional()
});

const pixelArtProjectSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(50),
    width: z.number().int().min(8).max(2048),
    height: z.number().int().min(8).max(2048),
    imageData: z.string().min(1, 'Los datos de imagen son requeridos'),
    frames_data: z.any().optional(),
    palette: z.any().optional(),
    settings: z.any().optional(),
    isUpdate: z.any().optional(),
    projectId: z.any().optional()
});

function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.errors.map(e => ({ msg: e.message, path: e.path.join('.') }));
            return res.status(400).json({ success: false, errors, message: errors[0].msg });
        }
        req.validatedBody = result.data;
        next();
    };
}

module.exports = {
    registerSchema,
    loginSchema,
    spriteProjectSchema,
    pixelArtProjectSchema,
    validate
};
