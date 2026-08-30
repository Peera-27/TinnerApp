import { Routes } from '@angular/router'
import { HomeComponent } from './home/home.component'
import { NotFoundComponent } from './not-found/not-found.component'
import { authGuard } from './_guard/auth.guard'

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
    {
        path: '',
        runGuardsAndResolvers: 'always',
        canActivate: [authGuard],
        children: [
            {
                path: 'members',
                loadComponent: () => import('./member/member.component').then(c => c.MemberComponent)
            },
            {
                path: 'members-profile/:username',
                loadComponent: () => import('./member/member-profile/member-profile.component').then(c => c.MemberProfileComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./profile/profile.component').then(c => c.ProfileComponent)
            },
            {
                path: 'followers',
                loadComponent: () => import('./followers/followers.component').then(c => c.FollowersComponent)
            },
            {
                path: 'followings',
                loadComponent: () => import('./followings/followings.component').then(c => c.FollowingsComponent)
            },
            {
                path: 'matches',
                loadComponent: () => import('./matches/matches.component').then(c => c.MatchesComponent)
            },
            {
                path: 'messages',
                loadComponent: () => import('./messages/messages.component').then(c => c.MessagesComponent)
            },
            {
                path: 'swipe',
                loadComponent: () => import('./swipe/swipe.component').then(c => c.SwipeComponent)
            },
            {
                path: 'blocked',
                loadComponent: () => import('./blocked/blocked.component').then(c => c.BlockedComponent)
            }
        ]
    },
    {
        path: 'login',
        loadComponent: () => import('./login/login.component').then(c => c.LoginComponent)
    },
    // both password screens are for people who cannot sign in, so neither of
    // them may sit behind the auth guard
    {
        path: 'forgot-password',
        loadComponent: () => import('./forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent)
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./reset-password/reset-password.component').then(c => c.ResetPasswordComponent)
    },
    {
        path: 'server-error',
        loadComponent: () => import('./sever-error/sever-error.component').then(c => c.SeverErrorComponent)
    },
    {
        path: 'member',
        runGuardsAndResolvers: 'always',
        canActivate: [authGuard],
        loadComponent: () => import('./member/member.component').then(c => c.MemberComponent)
    },
    {
        path: '404',
        loadComponent: () => import('./not-found/not-found.component').then(c => c.NotFoundComponent)
    },
    {
        path: '**',
        pathMatch: 'full',
        loadComponent: () => import('./not-found/not-found.component').then(c => c.NotFoundComponent)
    },
]
