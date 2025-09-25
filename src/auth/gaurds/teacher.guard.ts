import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TeacherGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const { auth } = request;

    // --- DEBUGGING BLOCK ---
    // The goal here is to print whatever is inside the `auth` object to see its structure.
    console.log('--- DEBUGGING TEACHER GUARD ---');
    if (auth && auth.claims) {
      console.log('Clerk Auth Claims Found:');
      // We use JSON.stringify to print the nested object in a readable way.
      console.log(JSON.stringify(auth.claims, null, 2)); 
    } else {
      console.log('Clerk auth object or claims not found on the request!');
      console.log('Full auth object:', auth);
    }
    console.log('--- END DEBUGGING ---');
    // --- END DEBUGGING BLOCK ---

    // For this test, we will temporarily allow ALL requests to pass.
    // This helps us confirm if the guard is the only thing blocking the request.
    return true; 
  }
}