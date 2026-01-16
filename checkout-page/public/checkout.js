(function(window) {
    class PaymentGateway {
        constructor(options) {
            this.options = options;
            this.baseUrl = document.currentScript.src.split('/checkout.js')[0] || 'http://localhost:3001';
            this.handleMessage = this.handleMessage.bind(this);
        }

        open() {
            // Create Modal
            this.modal = document.createElement('div');
            this.modal.id = 'payment-gateway-modal';
            this.modal.setAttribute('data-test-id', 'payment-modal');
            Object.assign(this.modal.style, {
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
                justifyContent: 'center', alignItems: 'center'
            });

            // Create Content
            const content = document.createElement('div');
            content.className = 'modal-content';
            Object.assign(content.style, {
                backgroundColor: 'white', width: '400px', height: '600px', 
                position: 'relative', borderRadius: '8px', overflow: 'hidden'
            });

            // Create Iframe
            const iframe = document.createElement('iframe');
            iframe.setAttribute('data-test-id', 'payment-iframe');
            iframe.src = `${this.baseUrl}/checkout?order_id=${this.options.orderId}&embedded=true`;
            Object.assign(iframe.style, { width: '100%', height: '100%', border: 'none' });

            // Close Button
            const closeBtn = document.createElement('button');
            closeBtn.setAttribute('data-test-id', 'close-modal-button');
            closeBtn.innerHTML = '×';
            Object.assign(closeBtn.style, {
                position: 'absolute', top: '10px', right: '15px', 
                background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
            });
            closeBtn.onclick = () => this.close();

            content.appendChild(iframe);
            content.appendChild(closeBtn);
            this.modal.appendChild(content);
            document.body.appendChild(this.modal);

            window.addEventListener('message', this.handleMessage);
        }

        close() {
            if (this.modal) {
                document.body.removeChild(this.modal);
                this.modal = null;
            }
            window.removeEventListener('message', this.handleMessage);
            if (this.options.onClose) this.options.onClose();
        }

        handleMessage(event) {
            // In production, verify event.origin
            if (!event.data) return;
            
            if (event.data.type === 'payment_success') {
                if (this.options.onSuccess) this.options.onSuccess(event.data.data);
                this.close();
            } else if (event.data.type === 'payment_failed') {
                if (this.options.onFailure) this.options.onFailure(event.data.data);
            }
        }
    }

    window.PaymentGateway = PaymentGateway;
})(window);