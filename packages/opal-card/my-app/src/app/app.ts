import { Component, signal } from '@angular/core';
import { Scraper } from './scraper/scraper';
import { GraphQLTester } from './graphql-tester/graphql-tester';

@Component({
  selector: 'app-root',
  imports: [Scraper, GraphQLTester],
  templateUrl: './app.html'
})
export class App {
  protected readonly title = signal('my-app');
}
