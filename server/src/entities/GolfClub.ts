import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum ClubType {
  DRIVER = "driver",
  FAIRWAY_WOOD = "fairway_wood",
  HYBRID = "hybrid",
  IRON_SET = "iron_set",
  WEDGE = "wedge",
  PUTTER = "putter",
}

export enum SkillLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  PROFESSIONAL = "professional",
}

export enum ShaftFlex {
  LADIES = "ladies",
  SENIOR = "senior",
  REGULAR = "regular",
  STIFF = "stiff",
  EXTRA_STIFF = "extra_stiff",
}

export enum SwingSpeed {
  SLOW = "slow",
  MODERATE = "moderate",
  FAST = "fast",
  VERY_FAST = "very_fast",
}

@Entity("golf_clubs")
export class GolfClub {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 100 })
  brand!: string;

  @Column({ type: "enum", enum: ClubType })
  clubType!: ClubType;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: number;

  @Column({ type: "simple-array" })
  skillLevels!: string[];

  @Column({ type: "simple-array" })
  shaftFlex!: string[];

  @Column({ type: "varchar", length: 100, nullable: true })
  loft!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "jsonb", nullable: true })
  descriptions!: Record<string, string> | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  imageUrl!: string;

  @Column({ type: "simple-array" })
  swingSpeedRange!: string[];

  @Column({ type: "int", default: 5 })
  forgivenessRating!: number;

  @Column({ type: "int", default: 5 })
  distanceRating!: number;

  @Column({ type: "int", default: 5 })
  accuracyRating!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
