import toastr from 'toastr';
import 'toastr/build/toastr.min.css';

export const showNotification = (message, imageUrl) => {
    toastr.options = {
      positionClass: 'toast-bottom-right',
      timeOut: 8000,
      closeButton: true,
      progressBar: false,
      preventDuplicates: true,
      newestOnTop: true,
    };
  
    const content = `
      <div style="display: flex; align-items: center;">
        <img src="${imageUrl}" style="width: 50px; height: 50px; margin-right: 10px;" alt="notification image"/>
        <div>${message}</div>
      </div>
    `;
  
    toastr.success(content, "Welcome!", { allowHtml: true });
  };