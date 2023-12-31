import { Injectable, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDto } from "src/dtos/create-user.dto";
import { User } from "src/entities/user.entity";
import { Repository } from "typeorm";
import { CustomError } from "src/custom/custom.error";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { UpdateUserDto } from "src/dtos/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService
  ) {}

  // 회원가입
  async signUp(createUserDto: CreateUserDto): Promise<User> {
    try {
      const { email, password, confirmPassword } = createUserDto;

      const existInfo = await this.userRepository.findOne({ where: { email } });

      if (existInfo) {
        throw new CustomError("중복된 이메일입니다.", HttpStatus.CONFLICT);
      }

      if (password !== confirmPassword) {
        throw new CustomError("비밀번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = this.userRepository.create({ ...createUserDto, password: hashedPassword });
      return this.userRepository.save(newUser);
    } catch (err) {
      throw err;
    }
  }

  // 로그인
  async login(email: string, password: string): Promise<string> {
    try {
      const existUser = await this.userRepository.findOne({ where: { email } });

      if (!existUser) {
        throw new CustomError("유저 정보가 없습니다", HttpStatus.NOT_FOUND);
      }

      const checkPassword = await bcrypt.compare(password, existUser.password);

      if (!checkPassword) {
        throw new CustomError(
          "유효하지 않은 이메일 또는 비밀번호 입니다.",
          HttpStatus.UNAUTHORIZED
        );
      }

      const token = jwt.sign(
        {
          userId: existUser.id,
          isAdmin: existUser.isAdmin,
        },
        this.configService.get<string>("JWT_SECRET_KEY"),
        { expiresIn: "10m" }
      );

      return token;
    } catch (err) {
      throw err;
    }
  }

  // 유저 상세조회(프로필)
  async getUserById(id: number): Promise<User> {
    try {
      const userDetail = await this.userRepository.findOne({
        where: { id },
        select: ["id", "profileImg", "email", "nickname", "phoneNumber", "remainingPoint"],
      });

      if (!userDetail) {
        throw new CustomError("유저 정보가 없습니다", HttpStatus.NOT_FOUND);
      }

      return userDetail;
    } catch (err) {
      throw err;
    }
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const { profileImg, password, afterPassword, afterConfirmPassword } = updateUserDto;
      const userDetail = await this.userRepository.findOne({ where: { id } });
      const match = await bcrypt.compare(password, userDetail.password);
      const updateProfileImg = profileImg ? profileImg : userDetail.profileImg;

      if (!match) {
        throw new CustomError(
          "유저 정보를 수정하려면 기존 비밀번호를 입력해 주세요.",
          HttpStatus.NOT_FOUND
        );
      }

      if (afterPassword !== "") {
        if (afterPassword === afterConfirmPassword) {
          const email = userDetail.email.split("@")[0];
          if (email.includes(afterPassword)) {
            throw new CustomError(
              "비밀번호는 이메일과 같은 값이 포함될 수 없습니다.",
              HttpStatus.BAD_REQUEST
            );
          } else {
            const updatePassword = await bcrypt.hash(afterPassword, 10);
            userDetail.password = updatePassword;
          }
        } else {
          throw new CustomError("비밀번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST);
        }
      }

      if (updateProfileImg) {
        userDetail.profileImg = updateProfileImg;
      }

      await this.userRepository.save(userDetail);

      return userDetail;
    } catch (err) {
      throw err;
    }
  }

  // 내예약내역 조회
  async getUserReservationDetails(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["reservations"],
    });
    // 추후에 쿼리빌더 적용해서 컬럼을 제한해서 출력할 예정

    if (!user) {
      throw new CustomError("사용자 정보를 찾을 수 없습니다", HttpStatus.NOT_FOUND);
    }

    user.reservations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return user;
  }
}
