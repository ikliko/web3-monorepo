import { render } from '@testing-library/react';

import DataStore from './data-store';

describe('DataStore', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<DataStore />);
    expect(baseElement).toBeTruthy();
  });
});
