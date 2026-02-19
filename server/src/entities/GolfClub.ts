import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ClubType, SkillLevel, ShaftFlex, SwingSpeed } from "../enums/club-enums";

export { ClubType, SkillLevel, ShaftFlex, SwingSpeed }; // Re-export for compatibility

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

  @Column({ type: "varchar", length: 120, nullable: true })
  sourceName!: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  sourceUrl!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  sourceUpdatedAt!: Date | null;

  @Column({ type: "decimal", precision: 3, scale: 2, nullable: true })
  dataConfidence!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
