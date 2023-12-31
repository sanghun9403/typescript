import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Seat } from "./seat.entity";
import { User } from "./user.entity";
import { Reservation } from "./reservation.entity";

@Entity("concerts")
export class Concert {
  @PrimaryGeneratedColumn({ type: "int" })
  id: number;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: true })
  concertImage: string;

  @Column()
  description: string;

  @Column({ nullable: false })
  concertTime: Date;

  @Column()
  concertCategory: string;

  @Column()
  location: string;

  @Column()
  maxSeats: number;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
  })
  updatedAt: Date;

  @OneToMany(() => Seat, (seat) => seat.concert, {
    cascade: true,
  })
  seats: Seat[];

  @OneToMany(() => Reservation, (reservation) => reservation.concert, {
    cascade: true,
  })
  reservations: Reservation[];

  @ManyToOne(() => User, (user) => user.concerts, {
    onDelete: "CASCADE",
    nullable: false,
  })
  user: User;
}
