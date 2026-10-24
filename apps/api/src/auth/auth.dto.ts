import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}
