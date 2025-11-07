import { Request, Response } from 'express';
import { uploadToCloudinary } from '../config/cloudinary';
import { ApiError } from '../utils/ApiError';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw ApiError.badRequest('No se proporcionó ninguna imagen');
    }

    const result = await uploadToCloudinary(req.file, 'confiape');

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId
      }
    });
  } catch (error: any) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir imagen',
      details: error.message
    });
  }
};

export const uploadMultipleImages = async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw ApiError.badRequest('No se proporcionaron imágenes');
    }

    const uploadPromises = req.files.map(file =>
      uploadToCloudinary(file, 'confiape')
    );

    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      data: {
        images: results.map(r => ({
          url: r.url,
          publicId: r.publicId
        }))
      }
    });
  } catch (error: any) {
    console.error('Error al subir imágenes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir imágenes',
      details: error.message
    });
  }
};
