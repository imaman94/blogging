import { Injectable, ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/entities/user.entity.js';
import { CreateAuthDto } from './dto/create-auth.dto.js';
import { SignInDto } from './dto/sign.dto.js';
import { LogsService } from '../logs/logs.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService,
  ) { }

  async signUp(createAuthDto: CreateAuthDto) {
    const existing = await this.userRepository.findOne({ where: { email: createAuthDto.email } });

    if (existing) {
      throw new ConflictException('Email is already registered');

    }

    const hashedPassword = await bcrypt.hash(createAuthDto.password, 10);
    try {
      const savedUser = await this.userRepository.save({
        ...createAuthDto,
        password: hashedPassword,
      });
      const { password: _, ...userResult } = savedUser;
      await this.logsService.createLog('USER_REGISTERED', 'info', {
        action: 'USER_REGISTERED',
        level: 'info',
        details: {
          user: userResult,
        },
      });
      return {
        message: 'User registered successfully!',
        data: userResult,
      };
    } catch (e) {
      await this.logsService.createLog('USER_REGISTERED', 'error', e);
      throw new InternalServerErrorException('Failed to register user');
    }
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.userRepository.findOne({ where: { email: signInDto.email } });

    if (!user) {
      throw new UnauthorizedException('Account not found');
    }

    const isActiveUser = await this.userRepository.findOne({ where: { id: user.id, isActive: true } });

    if (!isActiveUser) {
      throw new UnauthorizedException('Your account is not active! Please verify your account');
    }

    const isPasswordValid = await bcrypt.compare(signInDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    try {
      const payload = { sub: user.id, email: user.email, type: user.type };
      const accessToken = await this.jwtService.signAsync(payload);

      const { password: _, ...userResult } = user;
      await this.logsService.createLog('USER_LOGGED', 'info', {
        action: 'USER_LOGGED',
        level: 'info',
        details: {
          user: userResult,
          accessToken,
        },
      });
      return {
        message: 'Login successful!',
        accessToken,
        data: userResult,
      };
    } catch (e) {
      await this.logsService.createLog('USER_LOGGED', 'error', e);
      throw new InternalServerErrorException('Failed to login');
    }


  }
}
