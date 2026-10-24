import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthenticationGuard } from '../auth/authentication.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Read administrator overview counts' })
  async getDashboard() {
    const now = new Date();
    const [
      draftBusinesses,
      pendingBusinesses,
      approvedBusinesses,
      rejectedBusinesses,
      suspendedBusinesses,
      submittedIssues,
      underReviewIssues,
      inProgressIssues,
      resolvedIssues,
      rejectedIssues,
      closedIssues,
      pendingEntrepreneurs,
      eligibleCampaigns,
      totalUsers,
    ] = await this.prisma.$transaction([
      this.prisma.business.count({ where: { status: 'DRAFT' } }),
      this.prisma.business.count({ where: { status: 'PENDING' } }),
      this.prisma.business.count({ where: { status: 'APPROVED' } }),
      this.prisma.business.count({ where: { status: 'REJECTED' } }),
      this.prisma.business.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.issueReport.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.issueReport.count({ where: { status: 'UNDER_REVIEW' } }),
      this.prisma.issueReport.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.issueReport.count({ where: { status: 'RESOLVED' } }),
      this.prisma.issueReport.count({ where: { status: 'REJECTED' } }),
      this.prisma.issueReport.count({ where: { status: 'CLOSED' } }),
      this.prisma.entrepreneurClassification.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.advertisementCampaign.count({
        where: {
          status: 'ACTIVE',
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      businesses: {
        DRAFT: draftBusinesses,
        PENDING: pendingBusinesses,
        APPROVED: approvedBusinesses,
        REJECTED: rejectedBusinesses,
        SUSPENDED: suspendedBusinesses,
      },
      issues: {
        SUBMITTED: submittedIssues,
        UNDER_REVIEW: underReviewIssues,
        IN_PROGRESS: inProgressIssues,
        RESOLVED: resolvedIssues,
        REJECTED: rejectedIssues,
        CLOSED: closedIssues,
      },
      pendingEntrepreneurClassifications: pendingEntrepreneurs,
      activeAdvertisements: eligibleCampaigns,
      totalUsers,
    };
  }
}
