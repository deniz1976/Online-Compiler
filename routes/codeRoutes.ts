import express from 'express';
import { saveCode, updateCode, getCode, getAllCodes, deleteCode } from '../controllers/codeController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * /api/codes:
 *   get:
 *     summary: Get all user's saved codes
 *     tags: [Codes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's saved codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: number
 *                   example: 2
 *                 data:
 *                   type: object
 *                   properties:
 *                     codes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Code'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', protect, getAllCodes);

/**
 * @swagger
 * /api/codes:
 *   post:
 *     summary: Save a new code
 *     tags: [Codes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - code
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title for the saved code
 *               code:
 *                 type: string
 *                 description: The code to save
 *               language:
 *                 type: string
 *                 description: Programming language
 *                 default: cpp
 *               cppVersion:
 *                 type: string
 *                 enum: [cpp98, cpp11, cpp14, cpp17, cpp20]
 *                 description: C++ standard version for the code
 *                 default: cpp17
 *     responses:
 *       201:
 *         description: Code saved successfully
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
 *                     code:
 *                       $ref: '#/components/schemas/Code'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/', protect, saveCode);

/**
 * @swagger
 * /api/codes/{id}:
 *   get:
 *     summary: Get a specific saved code
 *     tags: [Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Code ID
 *     responses:
 *       200:
 *         description: Code details
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
 *                     code:
 *                       $ref: '#/components/schemas/Code'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', protect, getCode);

/**
 * @swagger
 * /api/codes/{id}:
 *   patch:
 *     summary: Update a saved code
 *     tags: [Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - code
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated title
 *               code:
 *                 type: string
 *                 description: Updated code
 *               cppVersion:
 *                 type: string
 *                 enum: [cpp98, cpp11, cpp14, cpp17, cpp20]
 *                 description: C++ standard version for the code
 *     responses:
 *       200:
 *         description: Code updated successfully
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
 *                     code:
 *                       $ref: '#/components/schemas/Code'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:id', protect, updateCode);

/**
 * @swagger
 * /api/codes/{id}:
 *   delete:
 *     summary: Delete a saved code
 *     tags: [Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Code ID
 *     responses:
 *       204:
 *         description: No content (successfully deleted)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', protect, deleteCode);

export default router; 