import React from 'react';
import styled from 'styled-components';

const StepLoader = ({ step }) => {
  // Mapping steps (1, 2, 3) to visual states
  // Step 1: Choosing Trailer (Starting - no checks yet)
  // Step 2: Adding Products (Trailer done - 1 check)
  // Step 3: Calculation Done (Everything done - all checks)

  const progress = step === 1 ? '5%' : step === 2 ? '50%' : '100%';
  const check1 = step > 1;
  const check2 = step > 2;
  const check3 = step > 2;

  return (
    <StyledWrapper $progress={progress} $check1={check1} $check2={check2} $check3={check3}>
      <div className="loader">
        <div className="bar" />
        <div className="check-bar-container">
          <div /> {/* Spacer for flex-between alignment */}
          <div className={`check check-1 ${check1 ? 'active' : ''}`}>
            <svg stroke="white" strokeWidth={2} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="m4.5 12.75 6 6 9-13.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
          <div className={`check check-2 ${check2 ? 'active' : ''}`}>
            <svg stroke="white" strokeWidth={2} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="m4.5 12.75 6 6 9-13.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
          <div className={`check check-3 ${check3 ? 'active' : ''}`}>
            <svg stroke="white" strokeWidth={2} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="m4.5 12.75 6 6 9-13.5" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 2rem;
  padding: 10px 0; /* Prevents circles from being cut off at the top/bottom */

  .loader {
    position: relative;
    background-color: #334155;
    border-radius: 1em;
    height: 0.8em;
    width: 100%;
    max-width: 600px; /* Increased to match product-row better */
  }

  .bar {
    position: relative;
    background-color: rgb(0, 205, 0);
    width: ${props => props.$progress};
    height: 100%;
    border-radius: 1em;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 10px rgba(0, 205, 0, 0.4);
  }

  .check-bar-container {
    position: absolute;
    left: 0px;
    top: -10px; /* Adjusted for larger circles and centering */
    z-index: 69;
    display: flex;
    width: 100%;
    justify-content: space-between;
    height: 0.5em;
    pointer-events: none;
  }

  .check {
    border-radius: 1em;
    height: 2em; /* Slightly larger for better visibility */
    width: 2em;
    padding: 4px;
    background-color: #334155;
    transform: scale(0.85);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #1e293b;
  }

  .check.active {
    transform: scale(1.1);
    background-color: rgb(0, 205, 0);
    box-shadow: 0 0 15px rgba(0, 205, 0, 0.3);
  }
    
  .check svg {
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
    
  .check.active svg {
    opacity: 1;
  }
`;

export default StepLoader;
