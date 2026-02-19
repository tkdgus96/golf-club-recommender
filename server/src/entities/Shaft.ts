import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("shafts")
export class Shaft {
  @PrimaryColumn({ type: "varchar", length: 100 })
  id!: string;

  @Column({ type: "varchar", length: 100 })
  vendor!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "int" })
  category!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  x!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  y!: number;

  @Column({ type: "decimal", precision: 6, scale: 2 })
  weight!: number;

  @Column({ type: "varchar", length: 20 })
  flex!: string;

  @Column({ type: "varchar", length: 20 })
  tip!: string;

  @Column({ type: "varchar", length: 20 })
  butt!: string;

  @Column({ type: "varchar", length: 20 })
  torque!: string;

  @Column({ type: "varchar", length: 20 })
  launch!: string;

  @Column({ type: "varchar", length: 20 })
  spin!: string;

  @Column({ type: "varchar", length: 50 })
  type!: string;

  @Column({ type: "simple-array", default: "driver,fairway_wood" })
  applications!: string[];

  @Column({ type: "varchar", length: 255, nullable: true })
  imageUrl!: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  sourceName!: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true })
  sourceUrl!: string | null;

  @Column({ type: "decimal", precision: 3, scale: 2, nullable: true })
  dataConfidence!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
