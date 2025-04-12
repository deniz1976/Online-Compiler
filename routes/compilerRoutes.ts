import express from 'express';
import { compileCpp } from '../controllers/compilerController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * /api/compiler/cpp:
 *   post:
 *     summary: Compile and run C++ code
 *     tags: [Compiler]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: C++ code to compile and execute
 *               input:
 *                 type: string
 *                 description: Input to provide to the program
 *               saveCode:
 *                 type: boolean
 *                 description: Whether to save the code after successful execution
 *               title:
 *                 type: string
 *                 description: Title for the saved code (required if saveCode is true)
 *               cppVersion:
 *                 type: string
 *                 enum: [cpp98, cpp11, cpp14, cpp17, cpp20]
 *                 description: C++ standard version to use for compilation
 *                 default: cpp17
 *     responses:
 *       200:
 *         description: Code compiled and executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       description: Whether compilation and execution was successful
 *                     output:
 *                       type: string
 *                       description: Compilation output or execution result
 *                     executionTime:
 *                       type: number
 *                       description: Execution time in milliseconds
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Code warnings
 *                     savedCode:
 *                       $ref: '#/components/schemas/Code'
 *                     cppVersion:
 *                       type: string
 *                       enum: [cpp98, cpp11, cpp14, cpp17, cpp20]
 *                       description: C++ standard version used for compilation
 *       400:
 *         description: Bad request, validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized, no token provided or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/cpp', protect, compileCpp);

export default router; 