import Detection from "../entity/detection";
import { Repository } from "typeorm";
import User from "../entity/user";
import GeneralError, { NotFound } from "../model/error";
import { GetDetectionResponse, UpdateDetectionRequest } from "src/model/detection";
import Joi from "joi";

const validateDetections = Joi.number().required().greater(0);
const validateDetection = Joi.object<{ detectionId: number; userId: number }>({
  detectionId: Joi.number().required().greater(0),
  userId: Joi.number().required().greater(0),
});
const validateUpdateDetection = Joi.object<UpdateDetectionRequest>({
  id: Joi.number().required().greater(0),
  total: Joi.number().required().greater(0),
});

class DetectionService {
  detectionRepository: Repository<Detection>;
  userRepository: Repository<User>;

  constructor(detectionRepository: Repository<Detection>, userRepository: Repository<User>) {
    this.detectionRepository = detectionRepository;
    this.userRepository = userRepository;
  }

  save = async (
    req: {
      image: string;
      label: string;
      boundingBoxes: number[][];
      scores: number[];
      total: number;
    }[],
    userId: number
  ): Promise<GetDetectionResponse[]> => {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFound("User not found");

    const entities = req.map((v) => ({
      image: v.image,
      label: v.label,
      boundingBoxes: v.boundingBoxes,
      scores: v.scores,
      total: v.total,
      user: user,
    }));

    let detections = this.detectionRepository.create(entities);
    detections = await this.detectionRepository.save(detections);

    return detections.map((detection) => ({
      id: detection.id,
      image: detection.image,
      label: detection.label,
      scores: detection.scores,
      boundingBoxes: detection.boundingBoxes,
      total: detection.total,
      createdAt: detection.createdAt,
    }));
  };

  getDetections = async (userId: number): Promise<GetDetectionResponse[]> => {
    const error = validateDetections.validate(userId).error;
    if (error) throw error;
    const detections = await this.detectionRepository
      .createQueryBuilder("detection")
      .where("detection.user_id = :userId", { userId: userId })
      .orderBy("detection.created_at", "DESC")
      .getMany();

    return detections.map((detection) => ({
      id: detection.id,
      image: detection.image,
      label: detection.label,
      scores: detection.scores,
      boundingBoxes: detection.boundingBoxes,
      total: detection.total,
      createdAt: detection.createdAt,
    }));
  };

  getDetection = async (detectionId: number, userId: number): Promise<GetDetectionResponse> => {
    const error = validateDetection.validate({ detectionId: detectionId, userId: userId }).error;
    if (error) throw error;
    console.log(`lolos ${typeof detectionId}`);
    const detection = await this.detectionRepository.findOne({ where: { id: detectionId, userId: userId } });
    if (!detection) throw new NotFound("Detection not found");
    return {
      id: detection.id,
      image: detection.image,
      label: detection.label,
      scores: detection.scores,
      boundingBoxes: detection.boundingBoxes,
      total: detection.total,
      createdAt: detection.createdAt,
    };
  };

  update = async (req: UpdateDetectionRequest, userId: number): Promise<GetDetectionResponse> => {
    const error = validateUpdateDetection.validate(req).error;
    if (error) throw error;

    let detection = await this.detectionRepository.findOne({ where: { id: req.id, userId: userId } });
    if (!detection) throw new NotFound("Detection not found");

    detection.total = req.total;
    detection = await this.detectionRepository.save(detection);
    if (!detection) throw new GeneralError("Failed to update detection");

    return {
      id: detection.id,
      image: detection.image,
      label: detection.label,
      scores: detection.scores,
      boundingBoxes: detection.boundingBoxes,
      total: detection.total,
      createdAt: detection.createdAt,
    };
  };

  delete = async (detectionId: number, userId: number): Promise<GetDetectionResponse> => {
    const error = validateDetection.validate({ detectionId: detectionId, userId: userId }).error;
    if (error) throw error;

    const detection = await this.detectionRepository.findOne({ where: { id: detectionId, userId: userId } });
    if (!detection) throw new NotFound("Detection not found");

    const deleteResult = await this.detectionRepository.delete({ id: detectionId });
    if (!deleteResult.affected) throw new GeneralError("Failed to delete detection");

    return {
      id: detection.id,
      image: detection.image,
      label: detection.label,
      scores: detection.scores,
      boundingBoxes: detection.boundingBoxes,
      total: detection.total,
      createdAt: detection.createdAt,
    };
  };
}

export default DetectionService;
